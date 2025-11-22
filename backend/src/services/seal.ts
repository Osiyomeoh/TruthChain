import crypto from 'crypto';

/**
 * Seal Proof Interface
 * Represents a cryptographic integrity proof using Merkle trees
 */
export interface SealProof {
  merkleRoot: string;      // Root hash of Merkle tree
  chunks: number;          // Number of data chunks
  timestamp: number;        // Proof generation timestamp
  chunkSize: number;        // Size of each chunk in bytes
  algorithm: string;       // Hash algorithm used (SHA-256)
}

/**
 * Seal Verifier
 * Generates and verifies cryptographic integrity proofs using Merkle trees
 * 
 * This implementation follows the Seal protocol for provable data integrity:
 * 1. Chunk data into fixed-size pieces
 * 2. Build binary Merkle tree from chunks
 * 3. Root hash serves as integrity proof
 * 4. Any modification to data changes the root
 */
export class SealVerifier {
  private readonly DEFAULT_CHUNK_SIZE = 1024; // 1KB chunks
  private readonly HASH_ALGORITHM = 'sha256';
  
  /**
   * Generate Merkle tree proof for data integrity
   * 
   * @param data - Data to generate proof for (string or Buffer)
   * @param chunkSize - Optional chunk size (default: 1KB)
   * @returns SealProof with merkle root and metadata
   */
  async generateProof(data: string | Buffer, chunkSize: number = this.DEFAULT_CHUNK_SIZE): Promise<SealProof> {
    const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
    
    if (dataBuffer.length === 0) {
      throw new Error('Cannot generate proof for empty data');
    }
    
    // Chunk the data
    const chunks: Buffer[] = [];
    for (let i = 0; i < dataBuffer.length; i += chunkSize) {
      chunks.push(dataBuffer.slice(i, i + chunkSize));
    }
    
    // Build Merkle tree
    const merkleRoot = this.buildMerkleTree(chunks);
    
    return {
      merkleRoot,
      chunks: chunks.length,
      timestamp: Date.now(),
      chunkSize,
      algorithm: this.HASH_ALGORITHM,
    };
  }
  
  /**
   * Verify data integrity against original proof
   * 
   * @param data - Data to verify (string or Buffer)
   * @param originalProof - Original SealProof to compare against
   * @returns true if data matches original, false otherwise
   */
  async verifyIntegrity(data: string | Buffer, originalProof: SealProof): Promise<boolean> {
    try {
      const currentProof = await this.generateProof(data, originalProof.chunkSize);
      
      // Verify root hash matches
      const rootMatches = currentProof.merkleRoot === originalProof.merkleRoot;
      
      // Verify chunk count matches (optional - allows for padding differences)
      // const chunkCountMatches = currentProof.chunks === originalProof.chunks;
      
      return rootMatches;
    } catch (error) {
      console.error('Seal verification error:', error);
      return false;
    }
  }
  
  /**
   * Build binary Merkle tree from data chunks
   * 
   * @param chunks - Array of data chunks (Buffers)
   * @returns Root hash of Merkle tree (hex string)
   */
  private buildMerkleTree(chunks: Buffer[]): string {
    if (chunks.length === 0) {
      throw new Error('Cannot build Merkle tree from empty chunks');
    }
    
    // Hash each chunk
    let level = chunks.map(chunk => this.hashBuffer(chunk));
    
    // Build tree bottom-up
    while (level.length > 1) {
      const nextLevel: string[] = [];
      
      // Pair up hashes and combine
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = i + 1 < level.length ? level[i + 1] : left; // Duplicate last if odd
        nextLevel.push(this.hash(left + right));
      }
      
      level = nextLevel;
    }
    
    return level[0];
  }
  
  /**
   * Hash a string using SHA-256
   */
  private hash(data: string): string {
    return crypto.createHash(this.HASH_ALGORITHM).update(data, 'utf-8').digest('hex');
  }
  
  /**
   * Hash a Buffer using SHA-256
   */
  private hashBuffer(data: Buffer): string {
    return crypto.createHash(this.HASH_ALGORITHM).update(data).digest('hex');
  }
  
  /**
   * Get proof metadata (for debugging/logging)
   */
  getProofInfo(proof: SealProof): string {
    return `Seal Proof: ${proof.chunks} chunks, ${proof.chunkSize}B each, root: ${proof.merkleRoot.substring(0, 16)}...`;
  }
}

export const sealVerifier = new SealVerifier();