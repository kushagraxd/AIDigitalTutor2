declare module 'elevenlabs-node' {
  export interface ElevenLabsOptions {
    apiKey: string;
    voiceId?: string;
  }

  export interface TextToSpeechOptions {
    voiceId: string;
    fileName: string;
    textInput: string;
    stability?: number;
    similarityBoost?: number;
    style?: number;
    speakerBoost?: boolean;
    modelId?: string;
  }

  export interface VoiceResponse {
    voice_id: string;
    name: string;
    description?: string;
  }

  export interface SpeechResult {
    status: string;
    voice_id: string;
    text: string;
    file_location: string;
  }

  export default class ElevenLabs {
    constructor(options: ElevenLabsOptions);
    textToSpeech(options: TextToSpeechOptions): Promise<SpeechResult>;
    getVoices(): Promise<VoiceResponse[]>;
  }
}