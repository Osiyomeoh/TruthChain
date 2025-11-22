/**
 * Reputation System
 * Tracks creator reputation to prevent spam and malicious registrations
 */

interface CreatorReputation {
  address: string;
  totalRegistrations: number;
  verifiedRegistrations: number;
  challenges: number;
  successfulChallenges: number;
  reputationScore: number; // 0-100
  isTrusted: boolean;
  lastRegistration: number;
}

// In-memory store (in production, use database or blockchain)
const reputationStore = new Map<string, CreatorReputation>();

/**
 * Calculate reputation score based on activity
 */
function calculateReputationScore(reputation: CreatorReputation): number {
  let score = 50; // Base score
  
  // Positive factors
  if (reputation.verifiedRegistrations > 0) {
    score += Math.min(reputation.verifiedRegistrations * 5, 30);
  }
  
  if (reputation.totalRegistrations > 10) {
    score += Math.min((reputation.totalRegistrations - 10) * 0.5, 10);
  }
  
  // Negative factors
  if (reputation.challenges > 0) {
    const challengeRate = reputation.challenges / reputation.totalRegistrations;
    score -= challengeRate * 20; // Penalize challenged registrations
  }
  
  // Successful challenges (creator was wrong)
  if (reputation.successfulChallenges > 0) {
    score -= reputation.successfulChallenges * 10;
  }
  
  // Time-based decay (recent activity is better)
  const daysSinceLastActivity = (Date.now() - reputation.lastRegistration) / (1000 * 60 * 60 * 24);
  if (daysSinceLastActivity > 30) {
    score -= 5; // Slight penalty for inactivity
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get or create reputation for a creator
 */
export function getCreatorReputation(address: string): CreatorReputation {
  if (!reputationStore.has(address)) {
    const newReputation: CreatorReputation = {
      address,
      totalRegistrations: 0,
      verifiedRegistrations: 0,
      challenges: 0,
      successfulChallenges: 0,
      reputationScore: 50, // Default score
      isTrusted: false,
      lastRegistration: 0
    };
    reputationStore.set(address, newReputation);
    return newReputation;
  }
  
  const reputation = reputationStore.get(address)!;
  reputation.reputationScore = calculateReputationScore(reputation);
  reputation.isTrusted = reputation.reputationScore >= 70;
  
  return reputation;
}

/**
 * Update reputation after registration
 */
export function recordRegistration(address: string, isVerified: boolean = false) {
  const reputation = getCreatorReputation(address);
  reputation.totalRegistrations++;
  if (isVerified) {
    reputation.verifiedRegistrations++;
  }
  reputation.lastRegistration = Date.now();
  reputation.reputationScore = calculateReputationScore(reputation);
  reputation.isTrusted = reputation.reputationScore >= 70;
  
  reputationStore.set(address, reputation);
}

/**
 * Record a challenge to a registration
 */
export function recordChallenge(address: string, challengeSuccessful: boolean) {
  const reputation = getCreatorReputation(address);
  reputation.challenges++;
  if (challengeSuccessful) {
    reputation.successfulChallenges++;
  }
  reputation.reputationScore = calculateReputationScore(reputation);
  reputation.isTrusted = reputation.reputationScore >= 70;
  
  reputationStore.set(address, reputation);
}

/**
 * Check if creator is trusted
 */
export function isTrustedCreator(address: string): boolean {
  const reputation = getCreatorReputation(address);
  return reputation.isTrusted;
}

/**
 * Get reputation score
 */
export function getReputationScore(address: string): number {
  const reputation = getCreatorReputation(address);
  return reputation.reputationScore;
}

/**
 * Check if creator should be allowed to register
 * Returns warnings if reputation is low
 */
export function validateCreatorReputation(address: string): {
  allowed: boolean;
  warnings: string[];
  reputationScore: number;
} {
  const reputation = getCreatorReputation(address);
  const warnings: string[] = [];
  
  // Check reputation score
  if (reputation.reputationScore < 30) {
    warnings.push(`⚠️ Low reputation score: ${reputation.reputationScore}/100`);
    warnings.push(`   This creator has ${reputation.challenges} challenged registrations`);
  } else if (reputation.reputationScore < 50) {
    warnings.push(`⚠️ Moderate reputation score: ${reputation.reputationScore}/100`);
  }
  
  // Check for spam (too many registrations in short time)
  const recentRegistrations = reputation.totalRegistrations;
  const timeSinceLast = Date.now() - reputation.lastRegistration;
  const hoursSinceLast = timeSinceLast / (1000 * 60 * 60);
  
  if (recentRegistrations > 50 && hoursSinceLast < 24) {
    warnings.push(`⚠️ High registration rate detected (potential spam)`);
  }
  
  // Block if reputation is very low
  const allowed = reputation.reputationScore >= 20;
  
  return {
    allowed,
    warnings,
    reputationScore: reputation.reputationScore
  };
}

