/**
 * Similarity Detection Service
 * Detects visually similar images to prevent altered version registration
 */

interface SimilarImage {
  hash: string;
  attestationId: string;
  creator: string;
  timestamp: number;
  similarity: number; // 0-100, higher = more similar
}

interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  size?: number;
}

/**
 * Calculate a simple perceptual hash from image metadata
 * This is a simplified version - in production, use proper perceptual hashing
 */
export function calculatePerceptualHash(metadata: ImageMetadata, contentHash: string): string {
  // Use dimensions and content hash to create a perceptual signature
  const dims = `${metadata.width || 0}x${metadata.height || 0}`;
  const size = metadata.size || 0;
  const format = metadata.format || 'unknown';
  
  // Create a simple perceptual hash (in production, use proper pHash algorithm)
  const perceptualData = `${dims}-${size}-${format}-${contentHash.slice(0, 16)}`;
  
  // Simple hash of the perceptual data
  let hash = 0;
  for (let i = 0; i < perceptualData.length; i++) {
    const char = perceptualData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * Calculate similarity score between two hashes
 * Returns 0-100, where 100 = identical, 0 = completely different
 */
export function calculateSimilarity(hash1: string, hash2: string): number {
  if (hash1 === hash2) return 100;
  
  // Hamming distance for perceptual hashes
  if (hash1.length !== hash2.length) return 0;
  
  let differences = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) differences++;
  }
  
  const similarity = ((hash1.length - differences) / hash1.length) * 100;
  return Math.round(similarity);
}

/**
 * Check for similar images in the registry
 * This would query a database or blockchain for similar perceptual hashes
 */
export async function findSimilarImages(
  perceptualHash: string,
  threshold: number = 85 // 85% similarity threshold
): Promise<SimilarImage[]> {
  // In production, this would query a database or index
  // For now, return empty array (to be implemented with indexing service or database)
  // TODO: Implement actual similarity search using indexing service or dedicated index
  
  return [];
}

/**
 * Validate if registration should be allowed
 * Returns warnings and recommendations
 */
export interface ValidationResult {
  allowed: boolean;
  warnings: string[];
  similarImages: SimilarImage[];
  recommendation: 'allow' | 'warn' | 'block';
}

export async function validateRegistration(
  hash: string,
  metadata: ImageMetadata,
  creator: string,
  source: string
): Promise<ValidationResult> {
  const warnings: string[] = [];
  const perceptualHash = calculatePerceptualHash(metadata, hash);
  const similarImages = await findSimilarImages(perceptualHash, 85);
  
  let recommendation: 'allow' | 'warn' | 'block' = 'allow';
  
  // Check for similar images
  if (similarImages.length > 0) {
    const highestSimilarity = Math.max(...similarImages.map(s => s.similarity));
    
    if (highestSimilarity >= 95) {
      warnings.push(`⚠️ Very similar image already registered (${highestSimilarity}% similarity)`);
      warnings.push(`   Registered by: ${similarImages[0].creator.slice(0, 10)}...`);
      warnings.push(`   Timestamp: ${new Date(similarImages[0].timestamp).toISOString()}`);
      recommendation = 'block';
    } else if (highestSimilarity >= 85) {
      warnings.push(`⚠️ Similar image detected (${highestSimilarity}% similarity)`);
      warnings.push(`   Consider verifying this is the original version`);
      recommendation = 'warn';
    }
  }
  
  // Check source credibility (basic validation)
  const suspiciousSources = ['unknown', 'test', 'fake'];
  if (suspiciousSources.some(s => source.toLowerCase().includes(s))) {
    warnings.push(`⚠️ Source appears suspicious: "${source}"`);
    recommendation = recommendation === 'allow' ? 'warn' : recommendation;
  }
  
  // Check if creator has multiple recent registrations (potential spam)
  // TODO: Implement creator reputation check
  
  return {
    allowed: recommendation !== 'block',
    warnings,
    similarImages,
    recommendation
  };
}

