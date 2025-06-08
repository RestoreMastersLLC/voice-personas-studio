import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { voicePersonas } from '@/lib/db/schema';

export async function GET() {
  try {
    console.log('[Voice Personas API] Fetching personas from database...');
    
    // Fetch all active voice personas from database
    const personas = await db.select().from(voicePersonas);
    
    console.log(`[Voice Personas API] Found ${personas.length} personas in database`);
    
    // Transform to match frontend interface
    const transformedPersonas = personas.map(persona => ({
      id: persona.id,
      name: persona.name || 'Unknown',
      region: persona.region || 'Unknown',
      accent: persona.accent || 'Unknown',
      age: persona.age || 30,
      tone: persona.tone || 'Neutral',
      energy: persona.energy || 'Medium',
      description: persona.description || 'No description',
      avatar: persona.avatar || '👤',
      sampleText: persona.sampleText || 'Hello, this is a sample.',
      voiceSettings: persona.voiceSettings || { pitch: 0.8, rate: 0.9, volume: 0.8 },
      isDefault: persona.isDefault || false,
      isActive: persona.isActive !== false, // default to true if null
      createdAt: persona.createdAt,
      updatedAt: persona.updatedAt
    }));

    return NextResponse.json({
      success: true,
      data: transformedPersonas,
      count: transformedPersonas.length,
      message: 'Voice personas loaded from database'
    });

  } catch (error) {
    console.error('[Voice Personas API] Error fetching personas:', error);
    
    return NextResponse.json({
      success: false,
      error: String(error),
      message: 'Failed to fetch voice personas from database'
    }, { status: 500 });
  }
} 