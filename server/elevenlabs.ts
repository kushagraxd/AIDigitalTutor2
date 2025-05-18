import ElevenLabs from 'elevenlabs-node';
import fs from 'fs-extra';
import { log } from './vite';

/**
 * Eleven Labs Voice API integration for high-quality text-to-speech
 */

// Initialize Eleven Labs client
const apiKey = process.env.ELEVEN_LABS_API_KEY || '';
log(`Initializing Eleven Labs with API key (${apiKey ? 'present' : 'missing'})`, 'elevenlabs');

let elevenlabs: ElevenLabs | null = null;
if (apiKey) {
  elevenlabs = new ElevenLabs({
    apiKey: apiKey,
  });
} else {
  log('Eleven Labs API key missing - TTS features will be disabled', 'elevenlabs');
}

// Default voice ID - Rachel voice is one of the most natural sounding
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice ID

// Voices available in Eleven Labs
export const AVAILABLE_VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Calm and clear female voice' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', description: 'Enthusiastic female voice' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'Gentle female voice' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Warm male voice' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', description: 'Approachable female voice' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', description: 'Deep male voice' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', description: 'Confident male voice' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Pleasant male voice' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', description: 'Serious male voice' },
];

/**
 * Clean text for optimal speech synthesis
 * This removes markdown, code blocks, and other elements that don't work well in speech
 */
export function cleanTextForSpeech(text: string): string {
  return text
    // Remove code blocks completely
    .replace(/```[\s\S]*?```/g, 'I have shared some code examples in the text.')
    // Remove inline code
    .replace(/`[^`]+`/g, '')
    // Remove markdown formatting
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markers
    .replace(/\*([^*]+)\*/g, '$1')     // Remove italic markers
    .replace(/^#+\s+(.+)$/gm, '$1')    // Remove heading markers
    // Remove markdown links leaving just the text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bullet points and numbered lists but keep the text
    .replace(/^[\s-]*[-•*+][\s]+(.+)$/gm, '$1') // Clean bullet points
    .replace(/^\s*\d+\.\s+(.+)$/gm, '$1')      // Clean numbered list markers
    // Remove technical syntax
    .replace(/{[^}]*}/g, '')
    .replace(/<[^>]+>/g, '')
    // Fix URLs
    .replace(/https?:\/\/\S+/g, 'website link')
    // Clean whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate audio from text using Eleven Labs API
 */
export async function generateSpeechAudio(
  text: string, 
  voiceId: string = DEFAULT_VOICE_ID
): Promise<Buffer | null> {
  try {
    // Clean the text for speech
    const cleanedText = cleanTextForSpeech(text);
    
    if (!cleanedText) {
      log('No text to convert to speech', 'elevenlabs');
      return null;
    }
    
    // Verify API key is available
    if (!process.env.ELEVEN_LABS_API_KEY) {
      log('Missing Eleven Labs API key', 'elevenlabs');
      return null;
    }
    
    // Create a temporary file path for the audio (required by the SDK)
    const tempFilePath = `/tmp/speech-${Date.now()}.mp3`;
    
    // Log the text being sent for speech generation (for debugging)
    log(`Generating speech for text (${cleanedText.length} chars)`, 'elevenlabs');
    
    // Generate speech using Eleven Labs
    try {
      log(`Using voice ID: ${voiceId}`, 'elevenlabs');
      const result = await elevenlabs.textToSpeech({
        voiceId: voiceId, // Note the different parameter name (camelCase)
        fileName: tempFilePath, // Required by the SDK
        textInput: cleanedText, // Note the different parameter name
        modelId: 'eleven_multilingual_v2', // Use the multilingual model for better quality
        stability: 0.5,
        similarityBoost: 0.75,
        speakerBoost: true
      });
      
      log(`Speech generation result: ${JSON.stringify(result)}`, 'elevenlabs');
      
      // Check if the file was created
      const fileExists = await fs.pathExists(tempFilePath);
      if (!fileExists) {
        log(`Error: Output file was not created at ${tempFilePath}`, 'elevenlabs');
        return null;
      }
      
      // Read the file into a buffer
      const audioBuffer = await fs.readFile(tempFilePath);
      log(`Successfully read audio file, size: ${audioBuffer.length} bytes`, 'elevenlabs');
      
      // Clean up the temporary file
      await fs.unlink(tempFilePath).catch((err: Error) => {
        log(`Warning: Could not delete temp file: ${err.message}`, 'elevenlabs');
      });
      
      return audioBuffer;
    } catch (innerError: any) {
      log(`Inner error generating speech: ${innerError.message}`, 'elevenlabs');
      log(`Inner error stack: ${innerError.stack}`, 'elevenlabs');
      return null;
    }
  } catch (error: any) {
    log(`Error generating speech: ${error.message}`, 'elevenlabs');
    return null;
  }
}

/**
 * Get available voice options from Eleven Labs
 */
export async function getAvailableVoices() {
  try {
    // This could be expanded to fetch the actual voice list from the API
    // const voices = await elevenlabs.getVoices();
    return AVAILABLE_VOICES;
  } catch (error: any) {
    log(`Error fetching voices: ${error.message}`, 'elevenlabs');
    return AVAILABLE_VOICES; // Fallback to predefined list
  }
}