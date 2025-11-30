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
 * Retries with delays to handle transaction confirmation delays
 */
async function findAttestationAddress(hash: string, retries: number = 3, delayMs: number = 2000): Promise<string | null> {
  try {
    const hashBytes = hashToBytes(hash);
    const client = getSuiClient();
    const registryId = getRegistryObjectId();
    const packageId = getPackageId();
    
    console.log(`🔍 [VERIFY] Looking up hash: ${hash.substring(0, 16)}...`);
    console.log(`🔍 [VERIFY] Registry ID: ${registryId}`);
    console.log(`🔍 [VERIFY] Package ID: ${packageId}`);
    console.log(`🔍 [VERIFY] Hash bytes length: ${hashBytes.length} (expected 32)`);
    
    // Query the registry object
    const registry = await client.getObject({
      id: registryId,
      options: {
        showContent: true,
        showType: true,
      },
    });

    if (!registry.data || registry.data.content?.dataType !== 'moveObject') {
      console.error('❌ [VERIFY] Registry object not found or invalid');
      return null;
    }

    // The registry has a hash_to_id table (Table<vector<u8>, address>)
    // Tables in Sui are stored as dynamic fields
    // For vector<u8> keys, we need to use the bytes directly as a hex string
    
    // Method 1: Try dynamic field lookup using vector<u8> key
    // In Sui, vector<u8> keys in tables are stored as dynamic fields with hex encoding
    try {
      // Convert hash bytes to hex string for dynamic field lookup
      const hashHex = hashBytes.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Try using the hex string directly (Sui might encode it this way)
      const dynamicField = await client.getDynamicFieldObject({
        parentId: registryId,
        name: {
          type: '0x1::hex::Hex', // Try Hex type first
          value: hashHex,
        },
      });

      if (dynamicField.data && dynamicField.data.content?.dataType === 'moveObject') {
        const content = dynamicField.data.content as any;
        const address = content.fields?.value || content.fields?.name?.value;
        if (address) {
          console.log(`✅ [VERIFY] Found attestation via dynamic field: ${address}`);
          return address;
        }
      }
    } catch (error: any) {
      console.log(`⚠️ [VERIFY] Dynamic field lookup (Hex) failed: ${error.message}`);
      
      // Try with vector<u8> type directly
      try {
        const dynamicField = await client.getDynamicFieldObject({
          parentId: registryId,
          name: {
            type: 'vector<u8>',
            value: hashBytes,
          },
        });

        if (dynamicField.data && dynamicField.data.content?.dataType === 'moveObject') {
          const content = dynamicField.data.content as any;
          const address = content.fields?.value || content.fields?.name?.value;
          if (address) {
            console.log(`✅ [VERIFY] Found attestation via dynamic field (vector<u8>): ${address}`);
            return address;
          }
        }
      } catch (error2: any) {
        console.log(`⚠️ [VERIFY] Dynamic field lookup (vector<u8>) failed: ${error2.message}`);
      }
    }

    // Method 2: Query events to find attestations
    // This is more reliable but slower
    console.log(`🔍 [VERIFY] Trying event query method...`);
    try {
      const events = await client.queryEvents({
        query: {
          MoveEventType: `${packageId}::media_attestation::AttestationCreated`,
        },
        limit: 500, // Increased limit to find more recent events
        order: 'descending',
      });

      console.log(`🔍 [VERIFY] Found ${events.data.length} AttestationCreated events`);

      for (const event of events.data) {
        if (event.parsedJson) {
          const eventData = event.parsedJson as any;
          // Convert event hash from bytes array to hex string
          let eventHash: string;
          if (Array.isArray(eventData.media_hash)) {
            eventHash = eventData.media_hash
              .map((b: number) => b.toString(16).padStart(2, '0'))
              .join('')
              .toLowerCase();
          } else if (typeof eventData.media_hash === 'string') {
            eventHash = eventData.media_hash.toLowerCase().replace('0x', '');
          } else {
            continue;
          }
          
          const searchHash = hash.toLowerCase().replace('0x', '');
          
          if (eventHash === searchHash) {
            console.log(`✅ [VERIFY] Found matching attestation in events: ${eventData.attestation_id}`);
            return eventData.attestation_id;
          }
        }
      }
      
      console.log(`⚠️ [VERIFY] No matching hash found in events`);
    } catch (error: any) {
      console.error(`❌ [VERIFY] Event query failed: ${error.message}`);
    }

    // If not found and we have retries left, wait and retry
    if (retries > 0) {
      console.log(`⏳ [VERIFY] Not found, retrying in ${delayMs}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return findAttestationAddress(hash, retries - 1, delayMs);
    }

    console.log(`❌ [VERIFY] No attestation found for hash: ${hash}`);
    return null;
  } catch (error) {
    console.error('❌ [VERIFY] Error finding attestation address:', error);
    // Retry on error if we have retries left
    if (retries > 0) {
      console.log(`⏳ [VERIFY] Error occurred, retrying in ${delayMs}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return findAttestationAddress(hash, retries - 1, delayMs);
    }
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
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 [VERIFY] ===== VERIFICATION REQUEST =====`);
    console.log(`🔍 [VERIFY] Hash: ${hash}`);
    console.log(`🔍 [VERIFY] Hash length: ${hash.length} (expected 64)`);
    console.log(`🔍 [VERIFY] Timestamp: ${new Date().toISOString()}`);
    console.log('='.repeat(80));
    
    // Validate hash format
    if (hash.length !== 64) {
      console.error(`❌ [VERIFY] Invalid hash length: ${hash.length}, expected 64`);
      return null;
    }
    
    // Find the attestation address (with retries for transaction confirmation)
    const attestationAddress = await findAttestationAddress(hash, 3, 2000);
    
    if (!attestationAddress) {
      console.log(`❌ [VERIFY] No attestation found for hash: ${hash}`);
      console.log(`💡 [VERIFY] Possible reasons:`);
      console.log(`   - Transaction not yet confirmed (wait a few seconds and try again)`);
      console.log(`   - Hash was never registered`);
      console.log(`   - Wrong network (check SUI_RPC_URL)`);
      console.log(`   - Wrong registry/package ID`);
      console.log('='.repeat(80) + '\n');
      return null;
    }

    console.log(`✅ [VERIFY] Found attestation at address: ${attestationAddress}`);
    
    // Get the attestation details
    const attestation = await getAttestationDetails(attestationAddress);
    
    if (!attestation) {
      console.error(`❌ [VERIFY] Could not retrieve attestation details from address: ${attestationAddress}`);
      return null;
    }
    
    // Verify the hash matches (safety check)
    if (attestation.media_hash.toLowerCase() !== hash.toLowerCase()) {
      console.error(`❌ [VERIFY] Hash mismatch! Expected: ${hash}, Got: ${attestation.media_hash}`);
      return null;
    }
    
    console.log(`✅ [VERIFY] Verification successful!`);
    console.log(`   📋 Attestation ID: ${attestation.attestation_id}`);
    console.log(`   👤 Creator: ${attestation.creator}`);
    console.log(`   📅 Created: ${new Date(attestation.created_at).toISOString()}`);
    console.log(`   🔢 Verification count: ${attestation.verification_count}`);
    console.log('='.repeat(80) + '\n');
    
    return attestation;
  } catch (error) {
    console.error('❌ [VERIFY] Error verifying media hash:', error);
    if (error instanceof Error) {
      console.error(`   Error message: ${error.message}`);
      if (error.stack) {
        console.error(`   Stack trace: ${error.stack.split('\n').slice(0, 5).join('\n')}`);
      }
    }
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

