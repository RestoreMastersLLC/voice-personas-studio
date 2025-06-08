import { db } from '@/lib/db/connection';
import { detectedSpeakers } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export interface VoiceCharacteristics {
  pitch: string;
  tempo: string;
  emotion: string;
  clarity: string;
}

export interface VoiceFingerprint {
  id: string;
  signature: string;
  name: string;
  accent: string;
  characteristics: VoiceCharacteristics;
  confidence: number;
  firstDetected: Date;
  lastDetected: Date;
  detectionCount: number;
}

export interface VoiceMatchResult {
  matched: boolean;
  fingerprint?: VoiceFingerprint;
  confidence: number;
  suggestedName?: string;
}

class VoiceFingerprintingService {
  private static instance: VoiceFingerprintingService;

  private constructor() {
    console.log('[VoiceFingerprintingService] Initialized');
  }

  public static getInstance(): VoiceFingerprintingService {
    if (!VoiceFingerprintingService.instance) {
      VoiceFingerprintingService.instance = new VoiceFingerprintingService();
    }
    return VoiceFingerprintingService.instance;
  }

  /**
   * Find matching voice from existing database or suggest new name
   */
  public async findVoiceMatch(
    accent: string,
    characteristics: VoiceCharacteristics,
    qualityScore: number
  ): Promise<VoiceMatchResult> {
    try {
      console.log(`[VoiceFingerprinting] Finding match for ${accent} voice...`);

      // Generate voice signature for comparison
      const signature = this.generateVoiceSignature(accent, characteristics);
      
      // Search for existing similar voices
      const existingVoices = await this.findSimilarVoices(accent, characteristics);
      
      if (existingVoices.length > 0) {
        // Find best match
        const bestMatch = this.findBestMatch(signature, characteristics, existingVoices);
        
        if (bestMatch.confidence > 0.75) { // High confidence match
          console.log(`[VoiceFingerprinting] High confidence match found: ${bestMatch.match.name} (${bestMatch.confidence})`);
          
          // Update detection count and last seen
          await this.updateVoiceDetection(bestMatch.match.speakerId);
          
          return {
            matched: true,
            fingerprint: this.createFingerprint(bestMatch.match, signature, bestMatch.confidence),
            confidence: bestMatch.confidence,
            suggestedName: bestMatch.match.name
          };
        } else if (bestMatch.confidence > 0.5) { // Medium confidence
          console.log(`[VoiceFingerprinting] Medium confidence match: ${bestMatch.match.name} (${bestMatch.confidence})`);
          
          return {
            matched: false,
            confidence: bestMatch.confidence,
            suggestedName: `${bestMatch.match.name} (Similar)` // Suggest similar but create new
          };
        }
      }

      // No match found - generate intelligent new name
      const newName = this.generateIntelligentName(accent, characteristics, qualityScore);
      
      console.log(`[VoiceFingerprinting] No match found, suggesting new name: ${newName}`);
      
      return {
        matched: false,
        confidence: 0,
        suggestedName: newName
      };
    } catch (error) {
      console.error('[VoiceFingerprinting] Error finding voice match:', error);
      
      // Fallback to intelligent naming
      return {
        matched: false,
        confidence: 0,
        suggestedName: this.generateIntelligentName(accent, characteristics, qualityScore)
      };
    }
  }

  /**
   * Generate voice signature for matching
   */
  private generateVoiceSignature(accent: string, characteristics: VoiceCharacteristics): string {
    const elements = [
      accent.toLowerCase().replace(/\s+/g, ''),
      characteristics.pitch.toLowerCase(),
      characteristics.tempo.toLowerCase(),
      characteristics.emotion.toLowerCase().substring(0, 3), // First 3 chars
      characteristics.clarity.toLowerCase().substring(0, 3)
    ];
    
    return elements.join('|');
  }

  /**
   * Find similar voices in database
   */
  private async findSimilarVoices(accent: string, characteristics: VoiceCharacteristics) {
    try {
      // Search for voices with same accent first
      const sameAccentVoices = await db.query.detectedSpeakers.findMany({
        where: eq(detectedSpeakers.accent, accent),
        orderBy: sql`created_at DESC`,
        limit: 50 // Recent voices only
      });

      // If no same accent, search for similar accents
      if (sameAccentVoices.length === 0) {
        const similarAccents = this.findSimilarAccents(accent);
        
        const similarVoices = await db.query.detectedSpeakers.findMany({
          where: sql`accent IN (${similarAccents.map(a => `'${a}'`).join(',')})`,
          orderBy: sql`created_at DESC`,
          limit: 30
        });
        
        return similarVoices;
      }

      return sameAccentVoices;
    } catch (error) {
      console.error('[VoiceFingerprinting] Error finding similar voices:', error);
      return [];
    }
  }

  /**
   * Find the best matching voice from candidates
   */
  private findBestMatch(
    targetSignature: string, 
    targetCharacteristics: VoiceCharacteristics, 
    candidates: any[]
  ) {
    let bestMatch = { match: null, confidence: 0 };

    for (const candidate of candidates) {
      if (!candidate.voiceCharacteristics || !candidate.name) continue;

      try {
        const candidateCharacteristics = candidate.voiceCharacteristics as VoiceCharacteristics;
        const candidateSignature = this.generateVoiceSignature(candidate.accent, candidateCharacteristics);
        
        const confidence = this.calculateVoiceMatch(
          targetSignature, 
          targetCharacteristics,
          candidateSignature,
          candidateCharacteristics
        );

        if (confidence > bestMatch.confidence) {
          bestMatch = { match: candidate, confidence };
        }
      } catch (error) {
        console.warn(`[VoiceFingerprinting] Error processing candidate ${candidate.speakerId}:`, error);
        continue;
      }
    }

    return bestMatch;
  }

  /**
   * Calculate voice matching confidence score
   */
  private calculateVoiceMatch(
    signature1: string,
    characteristics1: VoiceCharacteristics,
    signature2: string,
    characteristics2: VoiceCharacteristics
  ): number {
    let score = 0;
    let maxScore = 0;

    // Signature match (30% weight)
    if (signature1 === signature2) {
      score += 30;
    } else {
      // Partial signature match
      const sig1Parts = signature1.split('|');
      const sig2Parts = signature2.split('|');
      let matches = 0;
      
      for (let i = 0; i < Math.min(sig1Parts.length, sig2Parts.length); i++) {
        if (sig1Parts[i] === sig2Parts[i]) matches++;
      }
      
      score += (matches / sig1Parts.length) * 30;
    }
    maxScore += 30;

    // Pitch match (25% weight)
    score += this.compareCharacteristic(characteristics1.pitch, characteristics2.pitch) * 25;
    maxScore += 25;

    // Tempo match (20% weight)
    score += this.compareCharacteristic(characteristics1.tempo, characteristics2.tempo) * 20;
    maxScore += 20;

    // Emotion match (15% weight)
    score += this.compareCharacteristic(characteristics1.emotion, characteristics2.emotion) * 15;
    maxScore += 15;

    // Clarity match (10% weight)
    score += this.compareCharacteristic(characteristics1.clarity, characteristics2.clarity) * 10;
    maxScore += 10;

    return score / maxScore;
  }

  /**
   * Compare individual voice characteristics
   */
  private compareCharacteristic(char1: string, char2: string): number {
    if (!char1 || !char2) return 0;
    
    const c1 = char1.toLowerCase();
    const c2 = char2.toLowerCase();
    
    if (c1 === c2) return 1.0;
    
    // Partial matches for similar characteristics
    const similarityMap: Record<string, string[]> = {
      'high': ['medium-high'],
      'medium-high': ['high', 'medium'],
      'medium': ['medium-high', 'medium-low'],
      'medium-low': ['medium', 'low'],
      'low': ['medium-low'],
      'fast': ['moderate'],
      'moderate': ['fast', 'slow'],
      'slow': ['moderate'],
      'professional': ['confident', 'instructional'],
      'confident': ['professional', 'encouraging'],
      'warm': ['encouraging', 'friendly'],
      'excellent': ['good'],
      'good': ['excellent']
    };

    if (similarityMap[c1]?.includes(c2)) return 0.7;
    if (similarityMap[c2]?.includes(c1)) return 0.7;
    
    return 0;
  }

  /**
   * Generate intelligent name based on voice characteristics
   */
  private generateIntelligentName(
    accent: string, 
    characteristics: VoiceCharacteristics, 
    qualityScore: number
  ): string {
    // Gender-neutral names organized by accent/region
    const namesByAccent: Record<string, string[]> = {
      'General American': ['Alex Rivera', 'Jordan Hayes', 'Taylor Morgan', 'Casey Wright', 'Drew Collins'],
      'Southern U.S.': ['Avery Belle', 'Blake Sinclair', 'Carter Rose', 'Dylan Grace', 'Harper Stone'],
      'West Coast': ['Riley Ocean', 'Quinn Sage', 'Skyler Bay', 'Phoenix Cruz', 'Sage Harbor'],
      'New York': ['Brooklyn Vale', 'Hudson Park', 'Lennox Gray', 'Rowan Steel', 'Emery Chase'],
      'Midwest U.S.': ['River Plain', 'Dakota Field', 'Sterling Oak', 'Camden Hill', 'Weston Vale'],
      'British RP': ['Avery Cambridge', 'Blake Windsor', 'Charlie Ashworth', 'Finley Sterling', 'Hadley Cross'],
      'Australian': ['Riley Coastal', 'Blake Summit', 'Charlie Reef', 'Finley Grove', 'Harper Bay'],
      'Canadian': ['River Pine', 'Blake Frost', 'Charlie Snow', 'Finley North', 'Harper Maple']
    };

    // Get appropriate name pool
    let namePool = namesByAccent[accent] || namesByAccent['General American'];
    
    // Adjust based on characteristics
    if (characteristics.emotion?.toLowerCase().includes('professional')) {
      namePool = ['Cameron Professional', 'Jordan Executive', 'Taylor Authority', 'Morgan Elite', 'Blake Corporate'];
    } else if (characteristics.emotion?.toLowerCase().includes('warm')) {
      namePool = ['Sage Warm', 'River Kind', 'Harper Gentle', 'Quinn Caring', 'Avery Heart'];
    } else if (characteristics.pitch?.toLowerCase().includes('high')) {
      namePool = ['Melody Bright', 'Aria Clear', 'Luna Light', 'Sky High', 'Nova Sharp'];
    } else if (characteristics.pitch?.toLowerCase().includes('low')) {
      namePool = ['Bass Strong', 'Vale Deep', 'Stone Solid', 'Ridge Low', 'Canyon Rich'];
    }

    // Select based on quality score
    const index = Math.floor((qualityScore / 10) * namePool.length);
    const selectedName = namePool[Math.min(index, namePool.length - 1)];
    
    // Add quality indicator for very high quality voices
    if (qualityScore >= 9.0) {
      return `${selectedName} ★`;
    }
    
    return selectedName;
  }

  /**
   * Find similar accents for broader matching
   */
  private findSimilarAccents(accent: string): string[] {
    const accentGroups: Record<string, string[]> = {
      'General American': ['Midwest U.S.', 'West Coast'],
      'Southern U.S.': ['General American'],
      'West Coast': ['General American', 'Canadian'],
      'New York': ['General American'],
      'Midwest U.S.': ['General American', 'Canadian'],
      'British RP': ['Australian'],
      'Australian': ['British RP'],
      'Canadian': ['General American', 'Midwest U.S.']
    };

    return accentGroups[accent] || [];
  }

  /**
   * Update voice detection count and timestamp
   */
  private async updateVoiceDetection(speakerId: string) {
    try {
      await db.update(detectedSpeakers)
        .set({ updatedAt: new Date() })
        .where(eq(detectedSpeakers.speakerId, speakerId));
    } catch (error) {
      console.error('[VoiceFingerprinting] Error updating voice detection:', error);
    }
  }

  /**
   * Create fingerprint object from match
   */
  private createFingerprint(match: any, signature: string, confidence: number): VoiceFingerprint {
    return {
      id: match.speakerId,
      signature,
      name: match.name,
      accent: match.accent,
      characteristics: match.voiceCharacteristics as VoiceCharacteristics,
      confidence,
      firstDetected: new Date(match.createdAt),
      lastDetected: new Date(match.updatedAt),
      detectionCount: 1 // Could track this in DB if needed
    };
  }

  /**
   * Get voice library statistics
   */
  public async getVoiceLibraryStats() {
    try {
      const stats = await db.select({
        totalVoices: sql<number>`count(distinct name)`,
        totalDetections: sql<number>`count(*)`,
        accentBreakdown: sql<string>`json_object_agg(accent, count(*))`
      }).from(detectedSpeakers);

      return stats[0] || { totalVoices: 0, totalDetections: 0, accentBreakdown: {} };
    } catch (error) {
      console.error('[VoiceFingerprinting] Error getting library stats:', error);
      return { totalVoices: 0, totalDetections: 0, accentBreakdown: {} };
    }
  }
}

export const voiceFingerprintingService = VoiceFingerprintingService.getInstance(); 