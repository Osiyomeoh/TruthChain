import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromHEX } from '@mysten/sui.js/utils';
import { decodeSuiPrivateKey } from '@mysten/sui.js/cryptography';

let suiClient: SuiClient | null = null;

export function getSuiClient(): SuiClient {
  if (!suiClient) {
    const RPC_URL = process.env.SUI_RPC_URL || getFullnodeUrl('testnet');
    suiClient = new SuiClient({ url: RPC_URL });
  }
  return suiClient;
}

function getRegistryObjectId(): string {
  // Check for new package first, fallback to old one for backward compatibility
  const REGISTRY_OBJECT_ID = process.env.TRUTHCHAIN_REGISTRY_OBJECT_ID || process.env.REGISTRY_OBJECT_ID;
  if (!REGISTRY_OBJECT_ID) {
    throw new Error('REGISTRY_OBJECT_ID or TRUTHCHAIN_REGISTRY_OBJECT_ID environment variable is required');
  }
  return REGISTRY_OBJECT_ID;
}

function getPackageId(): string {
  // Check for new package first, fallback to old one for backward compatibility
  const PACKAGE_ID = process.env.TRUTHCHAIN_PACKAGE_ID || process.env.PACKAGE_ID;
  if (!PACKAGE_ID) {
    throw new Error('PACKAGE_ID or TRUTHCHAIN_PACKAGE_ID environment variable is required');
  }
  return PACKAGE_ID;
}

function getSigner(): Ed25519Keypair | null {
  const PRIVATE_KEY = process.env.SUI_PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    console.warn('SUI_PRIVATE_KEY not set - cannot create blockchain transactions');
    return null;
  }
  try {
    if (PRIVATE_KEY.startsWith('suiprivkey')) {
      const { secretKey } = decodeSuiPrivateKey(PRIVATE_KEY);
      return Ed25519Keypair.fromSecretKey(secretKey);
    }
    const privateKeyBytes = fromHEX(PRIVATE_KEY.replace('0x', ''));
    return Ed25519Keypair.fromSecretKey(privateKeyBytes);
  } catch (error) {
    console.error('Error creating signer from private key:', error);
    return null;
  }
}

export interface MediaAttestation {
  media_hash: string;
  walrus_blob_id: string;
  created_at: number;
  creator: string;
  source: string;
  media_type: string;
  is_ai_generated: boolean;
  metadata: string;
  verification_count: number;
  attestation_id: string;
}

/**
 * Convert hex string hash to bytes array for Sui
 */
function hashToBytes(hash: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < hash.length; i += 2) {
    bytes.push(parseInt(hash.substr(i, 2), 16));
  }
  return bytes;
}

/**
 * Query the registry to find attestation address for a hash
 */
async function findAttestationAddress(hash: string): Promise<string | null> {
  try {
    const hashBytes = hashToBytes(hash);
    const client = getSuiClient();
    const registryId = getRegistryObjectId();
    
    // Query the registry object
    const registry = await client.getObject({
      id: registryId,
      options: {
        showContent: true,
        showType: true,
      },
    });

    if (!registry.data || registry.data.content?.dataType !== 'moveObject') {
      console.error('Registry object not found or invalid');
      return null;
    }

    // The registry has a hash_to_id table (Table<vector<u8>, address>)
    // Tables in Sui are stored as dynamic fields
    // The key type is vector<u8>, so we need to use the bytes array directly
    
    try {
      // Try to get the dynamic field (table entry) using vector<u8> as key
      const dynamicField = await client.getDynamicFieldObject({
        parentId: registryId,
        name: {
          type: '0x1::string::String', // Sui represents vector<u8> keys as String in dynamic fields
          value: hashBytes.map(b => String.fromCharCode(b)).join(''), // Convert bytes to string
        },
      });

      if (dynamicField.data && dynamicField.data.content?.dataType === 'moveObject') {
        const content = dynamicField.data.content as any;
        // The value should be the attestation address
        const address = content.fields?.value || content.fields?.name?.value;
        if (address) {
          return address;
        }
      }
    } catch (error) {
      // Dynamic field lookup might use different format
      console.log('Direct dynamic field lookup failed, trying events method:', error);
    }

    // Alternative: Query events to find attestations
    // Look for AttestationCreated events with matching hash
    const packageId = process.env.PACKAGE_ID;
    if (!packageId) {
      console.error('PACKAGE_ID environment variable is required');
      return null;
    }

    const events = await client.queryEvents({
      query: {
        MoveEventType: `${packageId}::media_attestation::AttestationCreated`,
      },
      limit: 100,
      order: 'descending',
    });

    for (const event of events.data) {
      if (event.parsedJson) {
        const eventData = event.parsedJson as any;
        // Compare hash (might need to convert format)
        const eventHash = Array.isArray(eventData.media_hash) 
          ? eventData.media_hash.map((b: number) => b.toString(16).padStart(2, '0')).join('')
          : eventData.media_hash;
        
        if (eventHash.toLowerCase() === hash.toLowerCase()) {
          return eventData.attestation_id;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding attestation address:', error);
    return null;
  }
}

/**
 * Get attestation details by address
 */
async function getAttestationDetails(attestationAddress: string): Promise<MediaAttestation | null> {
  try {
    const client = getSuiClient();
    const object = await client.getObject({
      id: attestationAddress,
      options: {
        showContent: true,
        showType: true,
      },
    });

    if (!object.data || object.data.content?.dataType !== 'moveObject') {
      return null;
    }

    const content = object.data.content as any;
    const fields = content.fields;

    // Convert media_hash from bytes array to hex string
    const mediaHashBytes = fields.media_hash || [];
    const mediaHash = mediaHashBytes
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('');

    return {
      media_hash: mediaHash,
      walrus_blob_id: fields.walrus_blob_id || '',
      created_at: Number(fields.created_at || 0),
      creator: fields.creator || '',
      source: fields.source || '',
      media_type: fields.media_type || '',
      is_ai_generated: fields.is_ai_generated || false,
      metadata: fields.metadata || '{}',
      verification_count: Number(fields.verification_count || 0),
      attestation_id: attestationAddress,
    };
  } catch (error) {
    console.error('Error getting attestation details:', error);
    return null;
  }
}

/**
 * Verify a media hash by querying the Sui blockchain
 */
export async function verifyMediaHash(hash: string): Promise<MediaAttestation | null> {
  try {
    console.log(`🔍 Querying Sui blockchain for hash: ${hash}`);
    
    // Find the attestation address
    const attestationAddress = await findAttestationAddress(hash);
    
    if (!attestationAddress) {
      console.log(`❌ No attestation found for hash: ${hash}`);
      return null;
    }

    console.log(`✅ Found attestation at address: ${attestationAddress}`);
    
    // Get the attestation details
    const attestation = await getAttestationDetails(attestationAddress);
    
    return attestation;
  } catch (error) {
    console.error('Error verifying media hash:', error);
    throw error;
  }
}

/**
 * Register media on the Sui blockchain
 */
export async function registerMediaOnChain(data: {
  hash: string;
  walrusBlobId: string;
  source: string;
  mediaType: string;
  isAiGenerated: boolean;
  metadata: string;
}): Promise<{ txDigest: string; attestationId?: string; creator?: string }> {
  const signer = getSigner();
  if (!signer) {
    throw new Error('SUI_PRIVATE_KEY not configured - cannot create blockchain transaction');
  }

  const client = getSuiClient();
  const packageId = getPackageId();
  const registryId = getRegistryObjectId();

  // Convert hash to bytes
  const hashBytes = hashToBytes(data.hash);

  // Create transaction
  const tx = new TransactionBlock();
  
  // Get Clock object (required for timestamp)
  const clock = tx.object('0x6'); // Sui Clock object ID
  
  // Call register_media function
  tx.moveCall({
    target: `${packageId}::media_attestation::register_media`,
    arguments: [
      tx.pure(hashBytes), // media_hash: vector<u8>
      tx.pure(Array.from(Buffer.from(data.walrusBlobId, 'utf-8'))), // walrus_blob_id: vector<u8>
      tx.pure(Array.from(Buffer.from(data.source, 'utf-8'))), // source: vector<u8>
      tx.pure(Array.from(Buffer.from(data.mediaType, 'utf-8'))), // media_type: vector<u8>
      tx.pure(data.isAiGenerated), // is_ai_generated: bool
      tx.pure(Array.from(Buffer.from(data.metadata, 'utf-8'))), // metadata: vector<u8>
      tx.object(registryId), // registry: &mut AttestationRegistry
      clock, // clock: &Clock
    ],
  });

  // Sign and execute transaction
  const result = await client.signAndExecuteTransactionBlock({
    signer,
    transactionBlock: tx,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });

  console.log('✅ Blockchain transaction executed:', result.digest);

  // Extract attestation ID and creator from events
  let attestationId: string | undefined;
  let creator: string | undefined;
  if (result.events) {
    for (const event of result.events) {
      if (event.type.includes('AttestationCreated')) {
        const eventData = event.parsedJson as any;
        attestationId = eventData.attestation_id;
        creator = eventData.creator;
        break;
      }
    }
  }

  return {
    txDigest: result.digest,
    attestationId,
    creator,
  };
}

