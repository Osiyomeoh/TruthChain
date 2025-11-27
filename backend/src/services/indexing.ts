/**
 * Indexing Service
 * 
 * Custom indexing and querying service for fast data access.
 * This service indexes attestation events for:
 * - Fast queries by creator, source, date, etc.
 * - Search capabilities
 * - Analytics and statistics
 * - Real-time updates
 */

export interface AttestationIndex {
  attestationId: string;
  mediaHash: string;
  creator: string;
  source: string;
  timestamp: number;
  mediaType: string;
  isAiGenerated: boolean;
  walrusBlobId: string;
  verificationCount: number;
}

export interface SearchFilters {
  creator?: string;
  source?: string;
  dateFrom?: number;
  dateTo?: number;
  mediaType?: string;
  isAiGenerated?: boolean;
}

export interface VerificationStats {
  totalAttestations: number;
  totalVerifications: number;
  topCreators: Array<{ creator: string; count: number }>;
  topSources: Array<{ source: string; count: number }>;
  attestationsByType: Record<string, number>;
  recentAttestations: AttestationIndex[];
}

class IndexingService {
  private attestationIndex: Map<string, AttestationIndex> = new Map();
  private creatorIndex: Map<string, Set<string>> = new Map();
  private sourceIndex: Map<string, Set<string>> = new Map();
  private timestampIndex: AttestationIndex[] = [];

  async indexAttestation(attestation: AttestationIndex): Promise<void> {
    console.log(`📇 Indexing attestation: ${attestation.attestationId}`);
    
    this.attestationIndex.set(attestation.attestationId, attestation);
    
    if (!this.creatorIndex.has(attestation.creator)) {
      this.creatorIndex.set(attestation.creator, new Set());
    }
    this.creatorIndex.get(attestation.creator)!.add(attestation.attestationId);
    
    if (!this.sourceIndex.has(attestation.source)) {
      this.sourceIndex.set(attestation.source, new Set());
    }
    this.sourceIndex.get(attestation.source)!.add(attestation.attestationId);
    
    this.timestampIndex.push(attestation);
    this.timestampIndex.sort((a, b) => b.timestamp - a.timestamp);
    
    console.log(`✅ Attestation indexed: ${attestation.attestationId}`);
  }

  async updateVerificationCount(attestationId: string, count: number): Promise<void> {
    const attestation = this.attestationIndex.get(attestationId);
    if (attestation) {
      attestation.verificationCount = count;
      console.log(`📊 Updated verification count for ${attestationId}: ${count}`);
    }
  }

  async searchAttestations(filters: SearchFilters): Promise<AttestationIndex[]> {
    console.log(`🔍 Searching attestations with filters:`, filters);
    
    let results: Set<string> | null = null;
    
    if (filters.creator) {
      const creatorResults = this.creatorIndex.get(filters.creator) || new Set();
      results = results ? this.intersect(results, creatorResults) : creatorResults;
    }
    
    if (filters.source) {
      const sourceResults = this.sourceIndex.get(filters.source) || new Set();
      results = results ? this.intersect(results, sourceResults) : new Set();
    }
    
    const attestationIds = results 
      ? Array.from(results)
      : Array.from(this.attestationIndex.keys());
    
    let attestations = attestationIds
      .map(id => this.attestationIndex.get(id))
      .filter((a): a is AttestationIndex => a !== undefined);
    
    if (filters.dateFrom) {
      attestations = attestations.filter(a => a.timestamp >= filters.dateFrom!);
    }
    
    if (filters.dateTo) {
      attestations = attestations.filter(a => a.timestamp <= filters.dateTo!);
    }
    
    if (filters.mediaType) {
      attestations = attestations.filter(a => a.mediaType === filters.mediaType);
    }
    
    if (filters.isAiGenerated !== undefined) {
      attestations = attestations.filter(a => a.isAiGenerated === filters.isAiGenerated);
    }
    
    attestations.sort((a, b) => b.timestamp - a.timestamp);
    
    console.log(`✅ Found ${attestations.length} attestations`);
    return attestations;
  }

  async getAttestationsByCreator(creator: string): Promise<AttestationIndex[]> {
    const attestationIds = this.creatorIndex.get(creator) || new Set();
    return Array.from(attestationIds)
      .map(id => this.attestationIndex.get(id))
      .filter((a): a is AttestationIndex => a !== undefined)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async getAttestationsBySource(source: string): Promise<AttestationIndex[]> {
    const attestationIds = this.sourceIndex.get(source) || new Set();
    return Array.from(attestationIds)
      .map(id => this.attestationIndex.get(id))
      .filter((a): a is AttestationIndex => a !== undefined)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async getVerificationStats(limit: number = 10): Promise<VerificationStats> {
    const attestations = Array.from(this.attestationIndex.values());
    
    const creatorCounts = new Map<string, number>();
    attestations.forEach(a => {
      creatorCounts.set(a.creator, (creatorCounts.get(a.creator) || 0) + 1);
    });
    
    const sourceCounts = new Map<string, number>();
    attestations.forEach(a => {
      sourceCounts.set(a.source, (sourceCounts.get(a.source) || 0) + 1);
    });
    
    const typeCounts: Record<string, number> = {};
    attestations.forEach(a => {
      typeCounts[a.mediaType] = (typeCounts[a.mediaType] || 0) + 1;
    });
    
    const totalVerifications = attestations.reduce((sum, a) => sum + a.verificationCount, 0);
    
    const topCreators = Array.from(creatorCounts.entries())
      .map(([creator, count]) => ({ creator, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
    
    const topSources = Array.from(sourceCounts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
    
    return {
      totalAttestations: attestations.length,
      totalVerifications,
      topCreators,
      topSources,
      attestationsByType: typeCounts,
      recentAttestations: this.timestampIndex.slice(0, limit),
    };
  }

  async getAttestationById(attestationId: string): Promise<AttestationIndex | null> {
    return this.attestationIndex.get(attestationId) || null;
  }

  async getRecentAttestations(limit: number = 20): Promise<AttestationIndex[]> {
    return this.timestampIndex.slice(0, limit);
  }

  private intersect(set1: Set<string>, set2: Set<string>): Set<string> {
    return new Set([...set1].filter(x => set2.has(x)));
  }

  getIndexSize(): { attestations: number; creators: number; sources: number } {
    return {
      attestations: this.attestationIndex.size,
      creators: this.creatorIndex.size,
      sources: this.sourceIndex.size,
    };
  }
}

export const indexingService = new IndexingService();

