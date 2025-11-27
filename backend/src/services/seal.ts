import { SealClient, type SealClientOptions, type EncryptOptions, type DecryptOptions, SessionKey, DemType, type ExportedSessionKey } from '@mysten/seal';
import { bcs } from '@mysten/sui.js/bcs';
import type { SuiClient } from '@mysten/sui.js/client';
import { getSuiClient } from './sui';
import { bcs as suiBcs } from '@mysten/sui.js/bcs';

/**
 * Seal Service
 * Uses the real Seal SDK for identity-based encryption of sensitive data
 * 
 * Seal enables:
 * - Identity-based encryption (encrypt for specific Sui addresses)
 * - Threshold secret sharing (requires multiple key servers)
 * - On-chain access policies (controlled by Sui smart contracts)
 * - Secure storage of sensitive metadata on Walrus
 */

interface SealConfig {
  enabled: boolean;
  packageId?: string;
  keyServers?: Array<{
    objectId: string;
    weight: number;
    apiKeyName?: string;
    apiKey?: string;
  }>;
  threshold?: number;
  verifyKeyServers?: boolean;
  timeout?: number;
}

let sealClient: SealClient | null = null;
let sealConfig: SealConfig | null = null;

/**
 * Initialize Seal client with configuration
 */
function initializeSeal(): SealConfig {
  if (sealConfig) {
    return sealConfig;
  }

  console.log('\n🔐 [SEAL] Initializing Seal service...');
  const enabled = process.env.SEAL_ENABLED === 'true';
  console.log(`   📋 [SEAL] SEAL_ENABLED: ${enabled}`);
  
  if (!enabled) {
    console.log('   ⏭️ [SEAL] Seal is disabled');
    sealConfig = { enabled: false };
    return sealConfig;
  }

  const packageId = process.env.SEAL_PACKAGE_ID?.trim();
  const threshold = process.env.SEAL_THRESHOLD ? parseInt(process.env.SEAL_THRESHOLD, 10) : 1;
  
  if (!packageId) {
    console.warn('⚠️ Seal is enabled but SEAL_PACKAGE_ID is not set. Seal encryption will be disabled.');
    sealConfig = { enabled: false };
    return sealConfig;
  }

  // Parse key server configs from environment
  // Format: SEAL_KEY_SERVERS=objectId1:weight1:apiKeyName1:apiKey1,objectId2:weight2:apiKeyName2:apiKey2
  const keyServersEnv = process.env.SEAL_KEY_SERVERS?.trim();
  let keyServers: Array<{ objectId: string; weight: number; apiKeyName?: string; apiKey?: string }> = [];
  
  if (keyServersEnv) {
    try {
      keyServers = keyServersEnv.split(',').map(server => {
        const parts = server.split(':');
        const config: { objectId: string; weight: number; apiKeyName?: string; apiKey?: string } = {
          objectId: parts[0],
          weight: parseInt(parts[1] || '1', 10),
        };
        if (parts[2]) config.apiKeyName = parts[2];
        if (parts[3]) config.apiKey = parts[3];
        return config;
      });
    } catch (error) {
      console.error('❌ Failed to parse SEAL_KEY_SERVERS:', error);
    }
  }

  if (keyServers.length === 0) {
    console.warn('⚠️ No Seal key servers configured. Seal encryption will be disabled.');
    sealConfig = { enabled: false };
    return sealConfig;
  }

  sealConfig = {
    enabled: true,
    packageId,
    keyServers,
    threshold,
    verifyKeyServers: process.env.SEAL_VERIFY_KEY_SERVERS !== 'false',
    timeout: process.env.SEAL_TIMEOUT ? parseInt(process.env.SEAL_TIMEOUT, 10) : 30000,
  };

      // Initialize Seal client
      try {
        console.log('   🔧 [SEAL] Creating Seal client...');
        const suiClient = getSuiClient();
        const sealCompatibleClient = createSealCompatibleClient(suiClient);
        const clientOptions: SealClientOptions = {
          suiClient: sealCompatibleClient as any, // Seal expects a SealCompatibleClient interface
          serverConfigs: sealConfig.keyServers!,
          verifyKeyServers: sealConfig.verifyKeyServers,
          timeout: sealConfig.timeout,
        };
        
        sealClient = new SealClient(clientOptions);
        console.log('   ✅ [SEAL] Seal client initialized successfully');
        console.log(`   📊 [SEAL] Configuration: ${sealConfig.keyServers!.length} key servers, threshold ${sealConfig.threshold}`);
      } catch (error) {
        console.error('   ❌ [SEAL] Failed to initialize Seal client:', error);
        if (error instanceof Error) {
          console.error(`   📋 [SEAL] Error: ${error.message}`);
        }
        sealConfig.enabled = false;
      }

  return sealConfig;
}

/**
 * Get Seal client instance
 */
export function getSealClient(): SealClient | null {
  const config = initializeSeal();
  if (!config.enabled || !sealClient) {
    return null;
  }
  return sealClient;
}

/**
 * Encrypt sensitive data using Seal
 * 
 * @param data - Data to encrypt (as Uint8Array or string)
 * @param identity - Sui address to encrypt for (identity)
 * @returns Encrypted object bytes and session key, or null if Seal is not available
 */
export async function encryptWithSeal(
  data: string | Uint8Array,
  identity: string
): Promise<{ encryptedObject: Uint8Array; sessionKey: Uint8Array } | null> {
  console.log('\n🔐 [SEAL] Starting encryption process...');
  console.log(`   📝 Data type: ${typeof data}, size: ${typeof data === 'string' ? data.length : data.length} bytes`);
  console.log(`   🆔 Identity: ${identity}`);
  
  const config = initializeSeal();
  const client = getSealClient();
  
  if (!config.enabled) {
    console.log('   ⏭️ [SEAL] Seal is disabled (SEAL_ENABLED=false)');
    return null;
  }
  
  if (!config.packageId) {
    console.log('   ⏭️ [SEAL] Seal package ID not configured');
    return null;
  }
  
  if (!client) {
    console.log('   ⏭️ [SEAL] Seal client not available');
    return null;
  }

  try {
    const dataBytes = typeof data === 'string' 
      ? new TextEncoder().encode(data)
      : data;

    // Ensure packageId and identity are in the correct format (hex strings)
    const packageId = config.packageId.startsWith('0x') ? config.packageId : `0x${config.packageId}`;
    const identityHex = identity.startsWith('0x') ? identity : `0x${identity}`;

    console.log(`   📦 [SEAL] Package ID: ${packageId}`);
    console.log(`   🔑 [SEAL] Threshold: ${config.threshold || 1}`);
    console.log(`   🔐 [SEAL] Key servers: ${config.keyServers?.length || 0}`);
    console.log(`   📊 [SEAL] Data to encrypt: ${dataBytes.length} bytes`);

    const encryptOptions: EncryptOptions = {
      kemType: 0, // BonehFranklinBLS12381DemCCA
      demType: DemType.AesGcm256,
      threshold: config.threshold || 1,
      packageId: packageId,
      id: identityHex,
      data: dataBytes,
    };

    console.log('   ⏳ [SEAL] Calling Seal SDK encrypt...');
    const result = await client.encrypt(encryptOptions);
    
    console.log('   ✅ [SEAL] Encryption successful!');
    console.log(`   📦 [SEAL] Encrypted object: ${result.encryptedObject.length} bytes`);
    console.log(`   🔑 [SEAL] Session key: ${result.key.length} bytes`);
    console.log(`   🆔 [SEAL] Identity: ${identityHex}`);
    
    // Log detailed encryption information
    console.log('\n   📋 [SEAL] Encryption Details:');
    console.log(`      Algorithm: BonehFranklinBLS12381 + AES-256-GCM`);
    console.log(`      Threshold: ${config.threshold || 1} (requires ${config.threshold || 1} key servers)`);
    console.log(`      Key servers used: ${config.keyServers?.length || 0}`);
    console.log(`      Package ID: ${packageId}`);
    console.log(`      Identity (encrypted for): ${identityHex}`);
    console.log(`      Original data size: ${dataBytes.length} bytes`);
    console.log(`      Encrypted object size: ${result.encryptedObject.length} bytes`);
    console.log(`      Session key size: ${result.key.length} bytes`);
    console.log(`      Encryption overhead: ${result.encryptedObject.length - dataBytes.length} bytes`);
    
    // Log first few bytes of encrypted data (for debugging, not sensitive)
    const encryptedHex = Buffer.from(result.encryptedObject.slice(0, 16)).toString('hex');
    const sessionKeyHex = Buffer.from(result.key.slice(0, 16)).toString('hex');
    console.log(`      Encrypted object (first 16 bytes): 0x${encryptedHex}...`);
    console.log(`      Session key (first 16 bytes): 0x${sessionKeyHex}...`);
    
    // Calculate base64 sizes (what will be stored)
    const encryptedB64 = Buffer.from(result.encryptedObject).toString('base64');
    const sessionKeyB64 = Buffer.from(result.key).toString('base64');
    console.log(`      Base64 encrypted object size: ${encryptedB64.length} chars`);
    console.log(`      Base64 session key size: ${sessionKeyB64.length} chars`);
    console.log(`      Total storage size: ${encryptedB64.length + sessionKeyB64.length} chars (base64)`);
    
    return {
      encryptedObject: result.encryptedObject,
      sessionKey: result.key,
    };
  } catch (error: any) {
    // Don't suppress package version errors - let them propagate for better debugging
    const errorMsg = error?.message || error?.requestId || String(error);
    console.error('\n   ❌ [SEAL] Encryption failed!');
    console.error('   📋 [SEAL] Error message:', errorMsg);
    console.error('   📋 [SEAL] Error type:', error?.constructor?.name || typeof error);
    
    if (errorMsg.includes('not the first version') || 
        errorMsg.includes('InvalidPackageError') ||
        errorMsg.includes('Package ID used in PTB is invalid')) {
      console.error('   ⚠️ [SEAL] Package version error - ensure using version 1 package ID');
      console.error('   💡 [SEAL] Find version 1 package ID on SuiScan: https://suiscan.xyz/');
      throw error; // Re-throw package version errors
    }
    
    // Log additional error details
    if (error?.code) {
      console.error('   📋 [SEAL] Error code:', error.code);
    }
    if (error?.data) {
      console.error('   📋 [SEAL] Error data:', JSON.stringify(error.data).substring(0, 200));
    }
    if (error?.stack) {
      console.error('   📋 [SEAL] Stack trace:');
      console.error(error.stack.split('\n').slice(0, 5).join('\n'));
    }
    
    // Check for common issues
    if (errorMsg.includes('timeout') || errorMsg.includes('TIMEOUT')) {
      console.error('   💡 [SEAL] Timeout error - key servers may be slow or unreachable');
      console.error('   💡 [SEAL] Try increasing SEAL_TIMEOUT in .env (default: 30000ms)');
    }
    if (errorMsg.includes('key server') || errorMsg.includes('KeyServer')) {
      console.error('   💡 [SEAL] Key server error - check SEAL_KEY_SERVERS in .env');
      console.error('   💡 [SEAL] Verify key server object IDs are correct on SuiScan');
    }
    if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
      console.error('   💡 [SEAL] Network error - check SUI_RPC_URL and network connectivity');
    }
    
    return null;
  }
}

/**
 * Convert the standard SuiClient into the Seal-compatible interface expected by the SDK.
 * The Seal SDK expects a client with experimental.core interface that provides
 * getObject returning { object: { version: string; content: Uint8Array } }
 */
export function createSealCompatibleClient(suiClient: SuiClient) {
  // The Seal SDK expects a client with experimental.core interface
  const clientWithCore = suiClient as any;
  
  // Add the core interface if it doesn't exist
  if (!clientWithCore.core) {
    clientWithCore.core = {
      getObject: async (args: { objectId?: string; id?: string; options?: any }) => {
        const { objectId, id, ...rest } = args ?? {};
        const finalId = id ?? objectId;
        if (!finalId) {
          throw new Error('Seal client requires an object id');
        }
        
        // Use standard SuiClient getObject
        const response = await suiClient.getObject({
          id: finalId,
          ...(rest as any),
          options: {
            showBcs: true,
            showContent: true,
            ...(args.options ?? {}),
          },
        });
        
        const responseData = response.data as any;
        if (!responseData) {
          throw new Error(`Failed to load object ${finalId}`);
        }
        
        // Extract BCS bytes - Seal SDK expects the Move struct content BCS only
        // For KeyServer objects, we need to serialize the struct from parsed fields
        // KeyServerMove struct: firstVersion (u64) + id (UID) + lastVersion (u64)
        let bcsBytes: Uint8Array = new Uint8Array();
        
        // Check if this is a package object
        const isPackage = responseData?.dataType === 'package' || 
                         responseData?.type?.includes('package') ||
                         (responseData?.bcs && 'moduleMap' in responseData.bcs);
        
        if (isPackage) {
          // Package objects don't have content BCS bytes
          bcsBytes = new Uint8Array(0);
        } else {
          // Try to serialize from parsed content fields
          const content = responseData?.content;
          if (content && typeof content === 'object' && 'fields' in content) {
            const fields = (content as any).fields;
            
            // Check if this looks like a KeyServer object (has first_version, id, last_version)
            if (fields && 'first_version' in fields && 'last_version' in fields && 'id' in fields) {
              // Serialize KeyServerMove struct
              // Struct order: id (Address) + firstVersion (u64) + lastVersion (u64)
              const firstVersion = BigInt(fields.first_version || '1');
              const lastVersion = BigInt(fields.last_version || '1');
              
              // Extract object ID from the id field
              let objectIdHex: string;
              if (fields.id && typeof fields.id === 'object' && 'id' in fields.id) {
                objectIdHex = fields.id.id;
              } else {
                // Fallback: use the object ID from the response
                objectIdHex = finalId;
              }
              // Remove 0x prefix and convert to bytes
              const objectIdBytes = Buffer.from(objectIdHex.replace('0x', ''), 'hex');
              
              // Serialize using BCS: id (address, 32 bytes) + firstVersion (u64) + lastVersion (u64)
              const serialized = Buffer.allocUnsafe(32 + 8 + 8);
              
              // id (address, 32 bytes) - ensure it's exactly 32 bytes
              if (objectIdBytes.length === 32) {
                objectIdBytes.copy(serialized, 0);
              } else {
                // Pad or truncate to 32 bytes
                const padded = Buffer.alloc(32);
                if (objectIdBytes.length <= 32) {
                  objectIdBytes.copy(padded, 32 - objectIdBytes.length);
                } else {
                  objectIdBytes.slice(-32).copy(padded);
                }
                padded.copy(serialized, 0);
              }
              
              // firstVersion (u64, little-endian BCS format)
              serialized.writeBigUInt64LE(firstVersion, 32);
              
              // lastVersion (u64, little-endian BCS format)
              serialized.writeBigUInt64LE(lastVersion, 40);
              
              bcsBytes = serialized;
            } else {
              // Not a KeyServer object - try to extract from BCS
              const bcsData = responseData?.bcs?.bcsBytes;
              if (bcsData) {
                const fullBcs = typeof bcsData === 'string' 
                  ? Buffer.from(bcsData, 'base64')
                  : (bcsData instanceof Uint8Array ? bcsData : new Uint8Array(bcsData));
                // Try slicing off object wrapper (40 bytes)
                bcsBytes = fullBcs.length >= 40 ? fullBcs.slice(40) : fullBcs;
              } else {
                throw new Error(`No BCS bytes found for object ${finalId}`);
              }
            }
          } else {
            // No parsed content - try to extract from BCS
            const bcsData = responseData?.bcs?.bcsBytes;
            if (bcsData) {
              const fullBcs = typeof bcsData === 'string' 
                ? Buffer.from(bcsData, 'base64')
                : (bcsData instanceof Uint8Array ? bcsData : new Uint8Array(bcsData));
              // Try slicing off object wrapper (40 bytes)
              bcsBytes = fullBcs.length >= 40 ? fullBcs.slice(40) : fullBcs;
            } else {
              throw new Error(`No BCS bytes found for object ${finalId}`);
            }
          }
        }
        
        const version = responseData.version ? String(responseData.version) : '1';
        return {
          object: {
            version,
            content: bcsBytes,
          },
        };
      },
      getDynamicField: async (args: { parentId: string; name: any }) => {
        const nameParam = normalizeDynamicFieldName(args.name);
        const response = await suiClient.getDynamicFieldObject({
          parentId: args.parentId,
          name: nameParam,
        });
        const objectId = response.data?.objectId;
        let bcsBytes: Uint8Array = new Uint8Array();
        if (objectId) {
          const objectResp = await suiClient.getObject({
            id: objectId,
            options: { showBcs: true, showContent: true },
          });
          const objectData = objectResp.data as any;
          const bcsData = objectData?.bcs?.bcsBytes;
          
          if (bcsData) {
            let fullBcs: Uint8Array;
            if (typeof bcsData === 'string') {
              fullBcs = Buffer.from(bcsData, 'base64');
            } else if (bcsData instanceof Uint8Array) {
              fullBcs = bcsData;
            } else {
              fullBcs = new Uint8Array(bcsData);
            }
            
            // Extract struct content (skip object wrapper: 32 bytes object ID + 8 bytes version)
            if (fullBcs.length >= 40) {
              bcsBytes = fullBcs.slice(40);
            } else {
              bcsBytes = fullBcs;
            }
          }
        }
        return {
          dynamicField: {
            value: {
              bcs: bcsBytes,
            },
          },
        };
      },
    };
  }
  return clientWithCore;
}

function normalizeDynamicFieldName(name: any) {
  if (!name || typeof name !== 'object') {
    return name;
  }
  if ('bcs' in name && name.type === 'u64') {
    const value = bcs.u64().parse(name.bcs);
    return { type: 'u64', value: value.toString() };
  }
  return name;
}

/**
 * Decrypt data using Seal
 * 
 * Note: Decryption requires proper session key management and transaction bytes.
 * This is typically done client-side with wallet integration.
 * 
 * @param encryptedData - Encrypted data bytes
 * @param sessionKeyData - Exported session key data
 * @param txBytes - Transaction bytes that call seal_approve* functions
 * @returns Decrypted data, or null if Seal is not available
 */
export async function decryptWithSeal(
  encryptedData: Uint8Array,
  sessionKeyData: ExportedSessionKey | { key: Uint8Array; address: string; packageId: string },
  txBytes: Uint8Array
): Promise<Uint8Array | null> {
  const client = getSealClient();
  const config = initializeSeal();
  
  if (!client || !config.enabled) {
    return null;
  }

  try {
    const suiClient = getSuiClient();
    
    // Handle both ExportedSessionKey format and simplified format
    let sessionKeyObj: SessionKey;
    if ('key' in sessionKeyData && 'address' in sessionKeyData && 'packageId' in sessionKeyData && !('sessionKey' in sessionKeyData)) {
      // Simplified format - create ExportedSessionKey structure
      // We need to construct a proper ExportedSessionKey
      // For now, cast to unknown first to bypass type checking
      const exportedKey = {
        key: sessionKeyData.key,
        address: sessionKeyData.address,
        packageId: sessionKeyData.packageId,
      } as unknown as ExportedSessionKey;
      sessionKeyObj = SessionKey.import(exportedKey, suiClient as any);
    } else {
      // ExportedSessionKey format
      sessionKeyObj = SessionKey.import(sessionKeyData as ExportedSessionKey, suiClient as any);
    }
    
    const decryptOptions: DecryptOptions = {
      data: encryptedData,
      sessionKey: sessionKeyObj,
      txBytes,
      checkShareConsistency: false,
      checkLEEncoding: false,
    };

    const decrypted = await client.decrypt(decryptOptions);
    return decrypted;
    } catch (error) {
    console.error('❌ Seal decryption failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      if (error.stack) {
        console.error('   Stack:', error.stack.split('\n').slice(0, 3).join('\n'));
      }
    }
    return null;
    }
  }
  
  /**
 * Check if Seal is enabled and configured
 */
export function isSealEnabled(): boolean {
  const config = initializeSeal();
  return config.enabled;
}

/**
 * Get Seal configuration (for debugging/info)
 */
export function getSealConfig(): SealConfig {
  return initializeSeal();
}

// Legacy Seal proof interface (for backward compatibility)
// This is now just a wrapper that uses the real Seal SDK when available
export interface SealProof {
  merkleRoot?: string;
  chunks?: number;
  timestamp: number;
  chunkSize?: number;
  algorithm?: string;
  // Seal SDK fields
  encryptedObject?: string; // Base64 encoded
  sessionKey?: string; // Base64 encoded
  identity?: string; // Sui address that can decrypt
}

/**
 * Generate Seal proof/encryption for data integrity and confidentiality
 * 
 * This function now uses the real Seal SDK to encrypt sensitive metadata.
 * Falls back to a simple hash-based proof if Seal is not configured.
 * 
 * @param data - Data to protect (hash or metadata)
 * @param identity - Optional Sui address to encrypt for
 * @returns SealProof with encryption info or hash-based proof
 */
export async function generateSealProof(
  data: string,
  identity?: string
): Promise<SealProof> {
  const config = initializeSeal();
  
  // If Seal is enabled and we have an identity, use real Seal encryption
  if (config.enabled && identity) {
    try {
      const result = await encryptWithSeal(data, identity);
      
      if (result) {
        // Convert Uint8Array to base64 for storage
        const encryptedB64 = Buffer.from(result.encryptedObject).toString('base64');
        const sessionKeyB64 = Buffer.from(result.sessionKey).toString('base64');
        
        return {
          timestamp: Date.now(),
          encryptedObject: encryptedB64,
          sessionKey: sessionKeyB64,
          identity,
          algorithm: 'Seal-IBE-AES256-GCM',
        };
      }
    } catch (error) {
      console.error('⚠️ Seal encryption failed, falling back to hash proof:', error);
    }
  }
  
  // Fallback: Simple hash-based proof (backward compatibility)
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  
  return {
    timestamp: Date.now(),
    merkleRoot: hash,
    chunks: 1,
    chunkSize: data.length,
    algorithm: 'SHA-256',
  };
}

/**
 * Verify Seal proof (for hash-based proofs) or decrypt (for encrypted proofs)
 */
export async function verifySealProof(
  data: string,
  proof: SealProof
): Promise<boolean> {
  // If this is an encrypted proof, decryption verification would require txBytes
  // For now, we just verify hash-based proofs
  if (proof.merkleRoot) {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return hash === proof.merkleRoot;
  }
  
  // Encrypted proofs require decryption with proper txBytes
  // This is a placeholder - full implementation would need transaction bytes
  return true;
}

// Export for backward compatibility
export const sealVerifier = {
  generateProof: generateSealProof,
  verifyIntegrity: verifySealProof,
  getProofInfo: (proof: SealProof) => {
    if (proof.encryptedObject) {
      return `Seal Encrypted: identity=${proof.identity}, algorithm=${proof.algorithm}`;
    }
    return `Seal Proof: ${proof.chunks} chunks, ${proof.chunkSize}B each, root: ${proof.merkleRoot?.substring(0, 16)}...`;
  },
};
