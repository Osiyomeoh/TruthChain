import { Request, Response } from 'express';
import { z } from 'zod';
import { uploadToWalrus } from '../services/walrus';
import { sealVerifier, encryptWithSeal, isSealEnabled, getSealConfig } from '../services/seal';
import { verifyMediaHash, registerMediaOnChain } from '../services/sui';
import { indexingService } from '../services/indexing';
import { validateRegistration } from '../services/similarity';
import { validateCreatorReputation, recordRegistration, isTrustedCreator } from '../services/reputation';
import { detectAIGeneratedCombined } from '../services/aiDetection';

const RegisterSchema = z.object({
  hash: z.string().length(64, 'Hash must be 64 characters (SHA-256)'),
  source: z.string().min(1).max(100),
  mediaType: z.enum(['photo', 'video', 'document', 'audio']),
  isAiGenerated: z.boolean().default(false),
  metadata: z.string().optional().default('{}'),
  skipBlockchain: z.boolean().optional().default(false), // For wallet-based registration
  creator: z.string().optional(), // Creator address for reputation check
  imageMetadata: z.object({
    width: z.number().optional(),
    height: z.number().optional(),
    format: z.string().optional(),
    size: z.number().optional(),
  }).optional(), // Image metadata for similarity detection
});

const VerifySchema = z.object({
  hash: z.string().length(64)
});

export async function registerMedia(req: Request, res: Response) {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('📥 [REGISTRATION] ===== NEW REGISTRATION REQUEST =====');
    console.log('='.repeat(80));
    console.log(`   📋 [REGISTRATION] Timestamp: ${new Date().toISOString()}`);
    console.log(`   📋 [REGISTRATION] Raw request body keys:`, Object.keys(req.body));
    console.log(`   📋 [REGISTRATION] Raw creator value:`, req.body.creator);
    console.log(`   📋 [REGISTRATION] Raw creator type:`, typeof req.body.creator);
    console.log(`   📋 [REGISTRATION] Request headers:`, {
      'content-type': req.headers['content-type'],
      'origin': req.headers.origin,
      'user-agent': req.headers['user-agent']?.substring(0, 50) + '...'
    });
    
    const data = RegisterSchema.parse(req.body);
    
    console.log(`   📋 [REGISTRATION] Hash: ${data.hash.substring(0, 16)}...`);
    console.log(`   📋 [REGISTRATION] Source: ${data.source}`);
    console.log(`   📋 [REGISTRATION] Media type: ${data.mediaType}`);
    console.log(`   📋 [REGISTRATION] Creator address in request: ${data.creator || 'NOT PROVIDED'}`);
    console.log(`   📋 [REGISTRATION] Creator address type: ${typeof data.creator}`);
    console.log(`   📋 [REGISTRATION] Skip blockchain: ${data.skipBlockchain || false}`);
    
    // 0. Security checks: Similarity detection, reputation validation, and AI detection
    const securityWarnings: string[] = [];
    let creatorAddress = data.creator || '';
    
    // Trim whitespace if address is a string
    if (typeof creatorAddress === 'string') {
      creatorAddress = creatorAddress.trim();
    }
    
    console.log(`   📋 [REGISTRATION] Creator address after parsing: ${creatorAddress || 'EMPTY'}`);
    console.log(`   📋 [REGISTRATION] Creator address length: ${creatorAddress ? creatorAddress.length : 0}`);
    console.log(`   📋 [REGISTRATION] Creator address truthy: ${!!creatorAddress}`);
    console.log(`   📋 [REGISTRATION] Creator address type: ${typeof creatorAddress}`);
    
    // Validate creator address format (should be 66 chars: 0x + 64 hex chars)
    if (creatorAddress && creatorAddress.length !== 66) {
      console.warn(`   ⚠️ [REGISTRATION] Creator address length is ${creatorAddress.length}, expected 66 (0x + 64 hex chars)`);
    }
    
    // Parse metadata to extract image info
    let imageMetadata: any = {};
    let parsedMetadata: any = {};
    try {
      parsedMetadata = JSON.parse(data.metadata || '{}');
      if (data.imageMetadata) {
        imageMetadata = data.imageMetadata;
      } else if (parsedMetadata.width || parsedMetadata.height) {
        imageMetadata = {
          width: parsedMetadata.width,
          height: parsedMetadata.height,
          format: parsedMetadata.format || parsedMetadata.type,
          size: parsedMetadata.size
        };
      }
    } catch (e) {
      // Metadata parsing failed, continue without it
    }
    
    // AI Detection (automatic)
    let aiDetectionResult: any = null;
    let detectedAiGenerated = data.isAiGenerated; // Start with user-provided value
    
    if (data.mediaType === 'photo' && (imageMetadata.width || imageMetadata.height)) {
      try {
        aiDetectionResult = await detectAIGeneratedCombined(
          data.hash,
          parsedMetadata,
          data.source,
          imageMetadata
        );
        
        // Override user-provided flag if AI detection is confident
        if (aiDetectionResult.confidence >= 70) {
          detectedAiGenerated = aiDetectionResult.isAiGenerated;
          
          if (aiDetectionResult.isAiGenerated) {
            securityWarnings.push(`🤖 AI-generated content detected (${aiDetectionResult.confidence}% confidence)`);
            if (aiDetectionResult.indicators.length > 0) {
              securityWarnings.push(`   Indicators: ${aiDetectionResult.indicators.slice(0, 2).join(', ')}`);
            }
          }
        } else if (aiDetectionResult.confidence >= 50) {
          // Medium confidence - warn but don't override
          securityWarnings.push(`⚠️ Possible AI-generated content (${aiDetectionResult.confidence}% confidence)`);
        }
      } catch (error) {
        console.error('AI detection error:', error);
        // Continue with user-provided flag if detection fails
      }
    }
    
    // Similarity detection (if image metadata available)
    if (imageMetadata.width || imageMetadata.height) {
      const similarityCheck = await validateRegistration(
        data.hash,
        imageMetadata,
        creatorAddress,
        data.source
      );
      
      if (similarityCheck.warnings.length > 0) {
        securityWarnings.push(...similarityCheck.warnings);
      }
      
      // Block if recommendation is 'block'
      if (similarityCheck.recommendation === 'block') {
        return res.status(400).json({
          success: false,
          error: 'Registration blocked',
          reason: 'Very similar image already registered',
          warnings: similarityCheck.warnings,
          similarImages: similarityCheck.similarImages.map(s => ({
            hash: s.hash,
            creator: s.creator,
            timestamp: s.timestamp,
            similarity: s.similarity
          }))
        });
      }
    }
    
    // Reputation check (if creator address provided)
    if (creatorAddress) {
      const reputationCheck = validateCreatorReputation(creatorAddress);
      
      if (reputationCheck.warnings.length > 0) {
        securityWarnings.push(...reputationCheck.warnings);
      }
      
      // Block if reputation is too low
      if (!reputationCheck.allowed) {
        return res.status(403).json({
          success: false,
          error: 'Registration blocked',
          reason: 'Creator reputation too low',
          reputationScore: reputationCheck.reputationScore,
          warnings: reputationCheck.warnings
        });
      }
    }
    
    // 1. Prepare metadata for Walrus storage
    const metadata: any = {
      source: data.source,
      mediaType: data.mediaType,
      timestamp: Date.now(),
    };
    
    // 2. Encrypt sensitive metadata with Seal if enabled and creator is available
    let sealEncryption: { encryptedObject: string; sessionKey: string; identity: string } | null = null;
    console.log('\n🔐 [REGISTRATION] Seal Encryption Check:');
    const sealEnabled = isSealEnabled();
    const sealConfig = getSealConfig();
    console.log(`   📋 [REGISTRATION] Seal enabled: ${sealEnabled}`);
    console.log(`   📋 [REGISTRATION] Seal config:`, {
      enabled: sealConfig.enabled,
      packageId: sealConfig.packageId ? `${sealConfig.packageId.substring(0, 16)}...` : 'NOT SET',
      keyServers: sealConfig.keyServers?.length || 0,
      threshold: sealConfig.threshold
    });
    console.log(`   📋 [REGISTRATION] Creator address: ${creatorAddress || 'NOT PROVIDED'}`);
    console.log(`   📋 [REGISTRATION] Creator address truthy check: ${!!creatorAddress}`);
    console.log(`   📋 [REGISTRATION] Creator address length: ${creatorAddress ? creatorAddress.length : 0}`);
    console.log(`   📋 [REGISTRATION] Creator address type: ${typeof creatorAddress}`);
    console.log(`   📋 [REGISTRATION] Will attempt Seal encryption: ${sealEnabled && creatorAddress ? 'YES' : 'NO'}`);
    
    if (sealEnabled && creatorAddress) {
      try {
        console.log('   ✅ [REGISTRATION] Starting Seal encryption for sensitive metadata...');
        // Encrypt sensitive metadata (source URL, custom metadata)
        const sensitiveData = JSON.stringify({
          source: data.source,
          customMetadata: data.metadata || '{}',
        });
        
        console.log(`   📦 [REGISTRATION] Data to encrypt: ${sensitiveData.length} bytes`);
        console.log(`   🔑 [REGISTRATION] Identity (creator): ${creatorAddress}`);
        
        const encryptionResult = await encryptWithSeal(sensitiveData, creatorAddress);
        
        if (encryptionResult) {
          const encryptedB64 = Buffer.from(encryptionResult.encryptedObject).toString('base64');
          const sessionKeyB64 = Buffer.from(encryptionResult.sessionKey).toString('base64');
          
          sealEncryption = {
            encryptedObject: encryptedB64,
            sessionKey: sessionKeyB64,
            identity: creatorAddress,
          };
          
          // Store encrypted version in metadata
          metadata.sealEncrypted = sealEncryption;
          
          console.log('\n   ✅ [REGISTRATION] Seal encryption completed successfully!');
          console.log('\n   📋 [REGISTRATION] Seal Encryption Details:');
          console.log(`      🔐 Algorithm: BonehFranklinBLS12381 + AES-256-GCM`);
          console.log(`      🆔 Identity (encrypted for): ${creatorAddress}`);
          console.log(`      📦 Original data size: ${sensitiveData.length} bytes`);
          console.log(`      📦 Encrypted object (raw): ${encryptionResult.encryptedObject.length} bytes`);
          console.log(`      🔑 Session key (raw): ${encryptionResult.sessionKey.length} bytes`);
          console.log(`      📝 Encrypted object (base64): ${encryptedB64.length} chars`);
          console.log(`      📝 Session key (base64): ${sessionKeyB64.length} chars`);
          console.log(`      💾 Total storage size: ${encryptedB64.length + sessionKeyB64.length} chars (base64)`);
          console.log(`      📊 Encryption overhead: ${encryptionResult.encryptedObject.length - sensitiveData.length} bytes`);
          console.log(`      🔒 Security: Threshold ${sealConfig.threshold || 1}, ${sealConfig.keyServers?.length || 0} key servers`);
          console.log(`      📦 Package ID: ${sealConfig.packageId?.substring(0, 20)}...`);
          console.log('      💾 Encrypted metadata will be stored in Walrus');
          console.log('      🔓 Only the creator (identity) can decrypt this data using their wallet');
        } else {
          console.log('   ⚠️ [REGISTRATION] Seal encryption returned null (may be disabled or misconfigured)');
        }
      } catch (error) {
        console.error('\n   ❌ [REGISTRATION] Seal encryption FAILED with exception!');
        console.error('   ⚠️ [REGISTRATION] This is a critical error - encryption was attempted but threw an exception');
        console.error('   ⚠️ [REGISTRATION] Continuing without encryption...');
        
        if (error instanceof Error) {
          console.error(`   📋 [REGISTRATION] Error name: ${error.name}`);
          console.error(`   📋 [REGISTRATION] Error message: ${error.message}`);
          if (error.stack) {
            console.error(`   📋 [REGISTRATION] Stack trace:`);
            console.error(error.stack.split('\n').slice(0, 5).join('\n'));
          }
        } else {
          console.error(`   📋 [REGISTRATION] Error (non-Error object):`, error);
        }
        
        // Set sealStatus to 'failed' so we know encryption was attempted but failed
        // This will be set later in the code, but log it here for clarity
        console.error('   📋 [REGISTRATION] sealEncryptionStatus will be set to: failed');
      }
    } else {
      // Detailed explanation of why Seal is not being used
      console.log('   ⚠️ [REGISTRATION] Seal encryption will NOT be used because:');
      const sealIsEnabled = isSealEnabled();
      if (!sealIsEnabled) {
        console.log('      ❌ Seal is disabled (SEAL_ENABLED=false or not configured)');
        console.log('      💡 To enable: Set SEAL_ENABLED=true in backend .env file');
      } else {
        console.log('      ✅ Seal is enabled');
      }
      if (!creatorAddress) {
        console.log('      ❌ No creator address provided');
        console.log('      💡 To enable: Connect wallet or provide creator address in request');
      } else {
        console.log('      ✅ Creator address provided:', creatorAddress);
      }
      
      // Show Seal configuration status for debugging
      console.log('\n   📋 [REGISTRATION] Seal Configuration Status:');
      console.log(`      SEAL_ENABLED: ${process.env.SEAL_ENABLED || 'NOT SET'}`);
      console.log(`      SEAL_PACKAGE_ID: ${process.env.SEAL_PACKAGE_ID ? 'SET (' + process.env.SEAL_PACKAGE_ID.substring(0, 16) + '...)' : 'NOT SET'}`);
      console.log(`      SEAL_KEY_SERVERS: ${process.env.SEAL_KEY_SERVERS ? 'SET (' + (process.env.SEAL_KEY_SERVERS.split(',').length) + ' servers)' : 'NOT SET'}`);
      console.log(`      SEAL_THRESHOLD: ${process.env.SEAL_THRESHOLD || 'NOT SET'}`);
      console.log(`      isSealEnabled() returns: ${sealIsEnabled}`);
      console.log(`      creatorAddress: ${creatorAddress || 'EMPTY'}`);
      
      if (!sealIsEnabled) {
        console.log('\n   💡 To enable Seal encryption:');
        console.log('      1. Set SEAL_ENABLED=true in backend .env');
        console.log('      2. Set SEAL_PACKAGE_ID to your Seal access policy package ID');
        console.log('      3. Set SEAL_KEY_SERVERS to key server object IDs');
        console.log('      4. Set SEAL_THRESHOLD (e.g., 2)');
        console.log('      5. Restart the backend server');
      } else if (!creatorAddress) {
        console.log('\n   💡 Seal is enabled but no creator address provided');
        console.log('      Make sure the frontend is sending the creator address in the request');
      }
    }
    
    // 3. Generate Seal proof for integrity (hash-based or encrypted)
    console.log('\n🔐 Seal Proof Generation:');
    const sealProof = await sealVerifier.generateProof(data.hash, creatorAddress);
    console.log('   ✅ Seal proof generated:', sealVerifier.getProofInfo(sealProof));
    if (sealProof.encryptedObject) {
      console.log('   🔒 Using Seal encryption for proof');
    } else {
      console.log('   📝 Using hash-based proof (fallback)');
    }
    metadata.sealProof = sealProof;
    
    // 4. Upload hash + metadata to Walrus
    const walrusResult = await uploadToWalrus({
      hash: data.hash,
      metadata: metadata
    });
    console.log('✅ Uploaded to Walrus:', walrusResult.blobId);
    
    // 3. Create Sui blockchain transaction (skip if wallet-based)
    let blockchainTx: string | null = null;
    let attestationId: string | undefined;
    let creator: string | undefined;
    let blockchainError: string | undefined;
    
    if (!data.skipBlockchain) {
      try {
        const blockchainResult = await registerMediaOnChain({
          hash: data.hash,
          walrusBlobId: walrusResult.blobId,
          source: data.source,
          mediaType: data.mediaType,
          isAiGenerated: detectedAiGenerated, // Use detected value
          metadata: data.metadata || '{}',
        });
        blockchainTx = blockchainResult.txDigest;
        attestationId = blockchainResult.attestationId;
        creator = blockchainResult.creator || creatorAddress || undefined;
        console.log('✅ Blockchain transaction created:', blockchainTx);
        
        // Update reputation after successful registration
        if (creator) {
          recordRegistration(creator, true);
        }
        
        // 4. Index in indexing service for fast querying
        if (attestationId) {
          try {
            await indexingService.indexAttestation({
              attestationId,
              mediaHash: data.hash,
              creator: creator || '', // From blockchain transaction
              source: data.source,
              timestamp: Date.now(),
              mediaType: data.mediaType,
            isAiGenerated: data.isAiGenerated,
            walrusBlobId: walrusResult.blobId,
            verificationCount: 0,
          });
          console.log('✅ Indexed in indexing service:', attestationId);
        } catch (error) {
          console.error('⚠️ Indexing failed (non-critical):', error);
          // Continue even if indexing fails
        }
      }
    } catch (error) {
      console.error('❌ Blockchain transaction failed:', error);
      // Continue even if blockchain fails - Walrus upload succeeded
      blockchainError = error instanceof Error ? error.message : 'Unknown error';
    }
    } else {
      console.log('⏭️ Skipping blockchain transaction (wallet-based registration)');
    }
    
    // Determine Seal encryption status
    let sealStatus: string;
    if (sealEncryption) {
      sealStatus = 'used';
    } else if (!isSealEnabled()) {
      sealStatus = 'disabled';
    } else if (!creatorAddress) {
      sealStatus = 'no_creator';
    } else {
      sealStatus = 'failed';
    }
    
    const response: any = {
      success: true,
      hash: data.hash,
      walrus_blob_id: walrusResult.blobId, // Also include snake_case for compatibility
      walrusBlobId: walrusResult.blobId,
      walrusUrl: walrusResult.url,
      sealProof: sealProof,
      sealEncryption: sealEncryption || null, // Always include (null if not used) for debugging
      sealEncryptionStatus: sealStatus, // Always include status
      verificationUrl: `https://verify.truthchain.io/${data.hash}`,
      timestamp: Date.now(),
      blockchainTx: blockchainTx || null,
      attestationId: attestationId || null,
      blockchainError: blockchainError || null,
      skipBlockchain: data.skipBlockchain || false,
      securityWarnings: securityWarnings.length > 0 ? securityWarnings : undefined,
      creator: creator || creatorAddress || null,
      aiDetection: aiDetectionResult ? {
        isAiGenerated: aiDetectionResult.isAiGenerated,
        confidence: aiDetectionResult.confidence,
        method: aiDetectionResult.method,
        indicators: aiDetectionResult.indicators
      } : undefined,
      isAiGenerated: detectedAiGenerated, // Include final AI detection result
    };

    // Log Seal encryption status in response
    console.log('\n' + '='.repeat(80));
    console.log('📤 [REGISTRATION] ===== REGISTRATION RESPONSE =====');
    console.log('='.repeat(80));
    console.log(`   ✅ Success: ${response.success}`);
    console.log(`   🔐 Seal encryption: ${sealEncryption ? '✅ INCLUDED' : '❌ NOT INCLUDED'}`);
    console.log(`   📋 Seal encryption status: ${sealStatus}`);
    if (sealEncryption) {
      console.log(`   🔑 Identity: ${sealEncryption.identity}`);
      console.log(`   📦 Encrypted object size: ${sealEncryption.encryptedObject.length} chars (base64)`);
      console.log(`   🔑 Session key size: ${sealEncryption.sessionKey.length} chars (base64)`);
    } else {
      console.log(`   ⚠️ Seal encryption not included - Status: ${sealStatus}`);
      if (sealStatus === 'disabled') {
        console.log(`      💡 Seal is disabled in backend`);
      } else if (sealStatus === 'no_creator') {
        console.log(`      💡 No creator address provided`);
      } else if (sealStatus === 'failed') {
        console.log(`      💡 Seal encryption failed (check logs above)`);
      }
    }
    console.log(`   📝 Seal proof: ${sealProof.algorithm || 'hash-based'}`);
    console.log(`   📋 Response includes sealEncryption: ${response.sealEncryption !== undefined}`);
    console.log(`   📋 Response includes sealEncryptionStatus: ${response.sealEncryptionStatus !== undefined}`);
    console.log(`   📋 Response keys:`, Object.keys(response));
    console.log('='.repeat(80) + '\n');

    res.json(response);

  } catch (error) {
    console.error('Register error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.issues
      });
    }

    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function verifyMedia(req: Request, res: Response) {
  try {
    console.log('🔍 Verify request received:', req.body);
    const data = VerifySchema.parse(req.body);
    console.log('🔍 Verifying hash:', data.hash);

    // Query Sui blockchain for attestation
    const attestation = await verifyMediaHash(data.hash);

    if (!attestation) {
      // No attestation found on blockchain
      return res.json({
        status: 'unknown',
        hash: data.hash,
        message: 'No attestation found for this media hash'
      });
    }

    // Update verification count in indexing service
    try {
      await indexingService.updateVerificationCount(
        attestation.attestation_id,
        attestation.verification_count
      );
    } catch (error) {
      console.error('⚠️ Indexing update failed (non-critical):', error);
    }

    // Return real attestation data from blockchain
    const verification = {
      status: 'verified',
      hash: attestation.media_hash,
      timestamp: attestation.created_at,
      source: attestation.source,
      creator: attestation.creator,
      verificationCount: attestation.verification_count,
      mediaType: attestation.media_type,
      isAiGenerated: attestation.is_ai_generated,
      walrusBlobId: attestation.walrus_blob_id,
      attestationId: attestation.attestation_id,
      metadata: attestation.metadata,
    };

    res.json(verification);

  } catch (error) {
    console.error('Verify error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.issues
      });
    }

    res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Search attestations using indexing service
 */
export async function searchAttestations(req: Request, res: Response) {
  try {
    const { creator, source, dateFrom, dateTo, mediaType, isAiGenerated } = req.query;
    
    const filters: any = {};
    if (creator) filters.creator = creator as string;
    if (source) filters.source = source as string;
    if (dateFrom) filters.dateFrom = Number(dateFrom);
    if (dateTo) filters.dateTo = Number(dateTo);
    if (mediaType) filters.mediaType = mediaType as string;
    if (isAiGenerated !== undefined) {
      filters.isAiGenerated = isAiGenerated === 'true';
    }
    
    console.log('🔍 Search with filters:', filters);
    
    const results = await indexingService.searchAttestations(filters);
    
    res.json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get verification statistics from indexing service
 */
export async function getVerificationStats(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    
    console.log('📊 Getting verification statistics');
    
    const stats = await indexingService.getVerificationStats(limit);
    const indexSize = indexingService.getIndexSize();
    
    res.json({
      success: true,
      stats,
      indexSize,
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get attestations by creator
 */
export async function getAttestationsByCreator(req: Request, res: Response) {
  try {
    const creator = req.params.creator;
    
    if (!creator) {
      return res.status(400).json({
        success: false,
        error: 'Creator address is required'
      });
    }
    
    console.log(`🔍 Getting attestations by creator: ${creator}`);
    
    const results = await indexingService.getAttestationsByCreator(creator);
    
    res.json({
      success: true,
      creator,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('Get by creator error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get attestations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get encrypted metadata from Walrus for decryption
 */
export async function getEncryptedMetadata(req: Request, res: Response) {
  try {
    const { walrusBlobId } = req.body;
    
    if (!walrusBlobId) {
      return res.status(400).json({
        success: false,
        error: 'walrusBlobId is required'
      });
    }
    
    console.log(`🔓 Getting encrypted metadata from Walrus: ${walrusBlobId}`);
    
    const { retrieveFromWalrus } = require('../services/walrus');
    const walrusData = await retrieveFromWalrus(walrusBlobId);
    
    // Extract encrypted metadata if it exists
    const encryptedMetadata = walrusData?.metadata?.sealEncrypted;
    
    if (!encryptedMetadata) {
      return res.json({
        success: true,
        hasEncryption: false,
        message: 'No encrypted metadata found for this blob'
      });
    }
    
    res.json({
      success: true,
      hasEncryption: true,
      encryptedMetadata: {
        encryptedObject: encryptedMetadata.encryptedObject,
        sessionKey: encryptedMetadata.sessionKey,
        identity: encryptedMetadata.identity,
      },
      walrusBlobId,
    });
  } catch (error) {
    console.error('Get encrypted metadata error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get encrypted metadata',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Prepare decryption transaction bytes
 */
export async function prepareDecryptionTransaction(req: Request, res: Response) {
  try {
    const { identity } = req.body;
    
    if (!identity) {
      return res.status(400).json({
        success: false,
        error: 'identity (creator address) is required'
      });
    }
    
    const { getSealConfig } = require('../services/seal');
    const { TransactionBlock } = require('@mysten/sui.js/transactions');
    const { getSuiClient } = require('../services/sui');
    const { fromHEX } = require('@mysten/sui.js/utils');
    
    const sealConfig = getSealConfig();
    if (!sealConfig.enabled || !sealConfig.packageId) {
      return res.status(400).json({
        success: false,
        error: 'Seal is not enabled or configured'
      });
    }
    
    // Create a dummy ID for the transaction (this is just for seal_approve)
    // In a real scenario, this would be the actual ID used during encryption
    const dummyId = '53e66d756e6472206672f3f069'; // Example ID from Seal docs
    
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${sealConfig.packageId}::policy::seal_approve`,
      arguments: [
        tx.pure(Array.from(fromHEX(dummyId))),
      ],
    });
    
    tx.setSender(identity);
    
    const suiClient = getSuiClient();
    const txBytes = await tx.build({
      client: suiClient,
      onlyTransactionKind: true,
    });
    
    res.json({
      success: true,
      transactionBytes: Buffer.from(txBytes).toString('base64'),
      packageId: sealConfig.packageId,
      identity,
    });
  } catch (error) {
    console.error('Prepare decryption transaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to prepare decryption transaction',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Execute decryption (backend handles Seal SDK decryption)
 */
export async function executeDecryption(req: Request, res: Response) {
  try {
    const { encryptedObject, sessionKey, identity, transactionBytes } = req.body;
    
    if (!encryptedObject || !sessionKey || !identity || !transactionBytes) {
      return res.status(400).json({
        success: false,
        error: 'encryptedObject, sessionKey, identity, and transactionBytes are required'
      });
    }
    
    console.log('🔓 Executing decryption for identity:', identity);
    
    const { decryptWithSeal, getSealConfig } = require('../services/seal');
    const { SessionKey } = require('@mysten/seal');
    const { getSuiClient } = require('../services/sui');
    
    const sealConfig = getSealConfig();
    if (!sealConfig.enabled) {
      return res.status(400).json({
        success: false,
        error: 'Seal is not enabled'
      });
    }
    
    // Convert base64 strings to Uint8Array
    const encryptedBytes = Buffer.from(encryptedObject, 'base64');
    const sessionKeyBytes = Buffer.from(sessionKey, 'base64');
    const txBytes = Buffer.from(transactionBytes, 'base64');
    
    // Decrypt using Seal service
    const decryptedBytes = await decryptWithSeal(
      encryptedBytes,
      {
        key: sessionKeyBytes,
        address: identity,
        packageId: sealConfig.packageId!,
      } as any,
      txBytes
    );
    
    if (!decryptedBytes) {
      return res.status(500).json({
        success: false,
        error: 'Decryption failed - returned null'
      });
    }
    
    res.json({
      success: true,
      decryptedData: Buffer.from(decryptedBytes).toString('base64'),
    });
  } catch (error) {
    console.error('Execute decryption error:', error);
    res.status(500).json({
      success: false,
      error: 'Decryption failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}