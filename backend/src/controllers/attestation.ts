import { Request, Response } from 'express';
import { z } from 'zod';
import { uploadToWalrus } from '../services/walrus';
import { sealVerifier } from '../services/seal';
import { verifyMediaHash, registerMediaOnChain } from '../services/sui';
import { nautilusIndexer } from '../services/nautilus';
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
    const data = RegisterSchema.parse(req.body);
    
    // 0. Security checks: Similarity detection, reputation validation, and AI detection
    const securityWarnings: string[] = [];
    let creatorAddress = data.creator || '';
    
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
    
    // 1. Generate Seal proof for integrity
    const sealProof = await sealVerifier.generateProof(data.hash);
    console.log('✅ Seal proof generated:', sealVerifier.getProofInfo(sealProof));
    
    // 2. Upload hash + proof to Walrus
    const walrusResult = await uploadToWalrus({
      hash: data.hash,
      metadata: {
        source: data.source,
        mediaType: data.mediaType,
        timestamp: Date.now(),
        sealProof: sealProof // Include Seal proof
      }
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
        
        // 4. Index in Nautilus for fast querying
        if (attestationId) {
          try {
            await nautilusIndexer.indexAttestation({
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
          console.log('✅ Indexed in Nautilus:', attestationId);
        } catch (error) {
          console.error('⚠️ Nautilus indexing failed (non-critical):', error);
          // Continue even if Nautilus indexing fails
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
    
    const response = {
      success: true,
      hash: data.hash,
      walrus_blob_id: walrusResult.blobId, // Also include snake_case for compatibility
      walrusBlobId: walrusResult.blobId,
      walrusUrl: walrusResult.url,
      sealProof: sealProof,
      verificationUrl: `https://verify.truthchain.io/${data.hash}`,
      timestamp: Date.now(),
      blockchainTx: blockchainTx,
      attestationId: attestationId,
      blockchainError: blockchainError,
      skipBlockchain: data.skipBlockchain || false,
      securityWarnings: securityWarnings.length > 0 ? securityWarnings : undefined,
      creator: creator || creatorAddress || undefined,
      aiDetection: aiDetectionResult ? {
        isAiGenerated: aiDetectionResult.isAiGenerated,
        confidence: aiDetectionResult.confidence,
        method: aiDetectionResult.method,
        indicators: aiDetectionResult.indicators
      } : undefined,
      isAiGenerated: detectedAiGenerated, // Include final AI detection result
    };

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

    // Update verification count in Nautilus
    try {
      await nautilusIndexer.updateVerificationCount(
        attestation.attestation_id,
        attestation.verification_count
      );
    } catch (error) {
      console.error('⚠️ Nautilus update failed (non-critical):', error);
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
 * Search attestations using Nautilus
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
    
    console.log('🔍 Nautilus search with filters:', filters);
    
    const results = await nautilusIndexer.searchAttestations(filters);
    
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
 * Get verification statistics from Nautilus
 */
export async function getVerificationStats(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    
    console.log('📊 Getting verification statistics from Nautilus');
    
    const stats = await nautilusIndexer.getVerificationStats(limit);
    const indexSize = nautilusIndexer.getIndexSize();
    
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
    
    const results = await nautilusIndexer.getAttestationsByCreator(creator);
    
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