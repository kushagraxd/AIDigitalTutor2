import { useState, useCallback, useEffect } from 'react';

interface SpeechSynthesisOptions {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
}

interface UseSpeechSynthesisReturn {
  speak: (text: string) => void;
  cancel: () => void;
  speaking: boolean;
  voices: SpeechSynthesisVoice[];
  browserSupportsSpeechSynthesis: boolean;
  setOptions: (options: Partial<SpeechSynthesisOptions>) => void;
}

export const useSpeechSynthesis = (initialOptions: SpeechSynthesisOptions = {}): UseSpeechSynthesisReturn => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [options, setOptions] = useState<SpeechSynthesisOptions>({
    rate: initialOptions.rate ?? 1,
    pitch: initialOptions.pitch ?? 1,
    volume: initialOptions.volume ?? 1
  });
  const [speaking, setSpeaking] = useState(false);
  
  const browserSupportsSpeechSynthesis = !!window.speechSynthesis;

  // Load available voices
  useEffect(() => {
    if (!browserSupportsSpeechSynthesis) return;

    // Function to load voices
    const loadVoices = () => {
      const voiceOptions = window.speechSynthesis.getVoices();
      
      if (voiceOptions.length > 0) {
        setVoices(voiceOptions);
        console.log("Available voices:", voiceOptions.map(v => `${v.name} (${v.lang})`));
        
        // Set default voice if not already set
        if (!options.voice) {
          // First try to find Samantha (a good quality voice on many systems)
          const samanthaVoice = voiceOptions.find(
            voice => voice.name.includes('Samantha')
          );
          
          // Then try to find any US English voice
          const usEnglishVoice = voiceOptions.find(
            voice => voice.lang === 'en-US'
          );
          
          // Then any English voice
          const englishVoice = voiceOptions.find(
            voice => voice.lang.includes('en')
          );
          
          // Otherwise use the first voice
          const defaultVoice = samanthaVoice || usEnglishVoice || englishVoice || voiceOptions[0];
          
          console.log("Setting voice to:", defaultVoice?.name, defaultVoice?.lang);
          setOptions(prev => ({ ...prev, voice: defaultVoice }));
        }
      }
    };

    loadVoices();
    
    // Chrome loads voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [browserSupportsSpeechSynthesis]);

  // Function to speak text
  const speak = useCallback((text: string) => {
    if (!browserSupportsSpeechSynthesis || !text) {
      console.log("Speech synthesis not supported or no text provided");
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Process text to add SSML-like improvements for better prosody
    // Even though most browsers don't support SSML directly, we can simulate
    // some effects with careful text manipulation
    
    // Add slight pauses for commas, periods, etc.
    const processedText = text
      .replace(/\.\s+/g, '... ') // Longer pauses at end of sentences
      .replace(/\!\s+/g, '! ... ') // Emphasis after exclamations
      .replace(/\?\s+/g, '? ... ') // Pause after questions
      .replace(/,\s+/g, ', ') // Short pauses for commas
      .replace(/:\s+/g, ': ') // Pauses for colons
      .replace(/\s-\s/g, ' - ') // Slight pause for hyphens
      .replace(/(\d+)\./g, '$1... '); // Pauses after numbered lists
    
    // Break longer text into natural breath-like chunks
    // This is important for a natural cadence
    const breathChunks: string[] = [];
    
    // First split by sentences
    const sentences = processedText.match(/[^.!?]+[.!?]+/g) || [processedText];
    
    // Then process each sentence into breath chunks if needed
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      
      // Very short sentences don't need to be chunked further
      if (trimmed.length < 80) {
        breathChunks.push(trimmed);
        return;
      }
      
      // For longer sentences, break at grammatical boundaries
      const chunks = trimmed.split(/([,;:]\s+)/g);
      let currentChunk = '';
      
      chunks.forEach(chunk => {
        // If adding this chunk would make the current chunk too long, commit it
        if (currentChunk.length + chunk.length > 100) {
          if (currentChunk.length > 0) {
            breathChunks.push(currentChunk);
            currentChunk = chunk;
          } else {
            // If a single chunk is very long, keep it as is
            breathChunks.push(chunk);
          }
        } else {
          currentChunk += chunk;
        }
      });
      
      // Add any remaining chunk
      if (currentChunk.length > 0) {
        breathChunks.push(currentChunk);
      }
    });
    
    console.log(`Speaking text with natural pacing (${breathChunks.length} chunks)`);
    setSpeaking(true);
    
    // Function to speak each breath chunk with natural pauses
    const speakWithProsody = (index = 0) => {
      if (index >= breathChunks.length) {
        setSpeaking(false);
        return;
      }
      
      const chunk = breathChunks[index].trim();
      if (!chunk) {
        speakWithProsody(index + 1);
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(chunk);
      
      // Dynamically adjust rate for different sentence types to sound more natural
      let chunkRate = options.rate || 1.0;
      
      // Questions tend to be spoken a bit more slowly
      if (chunk.endsWith('?')) {
        chunkRate *= 0.9;
      }
      
      // Exclamations often have more energy
      if (chunk.endsWith('!')) {
        chunkRate *= 1.1;
      }
      
      // Apply options
      if (options.voice) utterance.voice = options.voice;
      utterance.rate = chunkRate;
      if (options.pitch) utterance.pitch = options.pitch;
      if (options.volume) utterance.volume = options.volume;

      utterance.onend = () => {
        // Add a very slight pause between chunks (like breathing)
        setTimeout(() => {
          speakWithProsody(index + 1);
        }, 150);
      };
      
      utterance.onerror = (e) => {
        console.error("Speech synthesis error:", e);
        speakWithProsody(index + 1);
      };

      window.speechSynthesis.speak(utterance);
    };
    
    // Start speaking with natural prosody
    speakWithProsody();
  }, [browserSupportsSpeechSynthesis, options]);

  // Function to cancel speech
  const cancel = useCallback(() => {
    if (!browserSupportsSpeechSynthesis) return;

    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [browserSupportsSpeechSynthesis]);

  // Update options
  const updateOptions = useCallback((newOptions: Partial<SpeechSynthesisOptions>) => {
    setOptions(prevOptions => ({ ...prevOptions, ...newOptions }));
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (browserSupportsSpeechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [browserSupportsSpeechSynthesis]);

  return {
    speak,
    cancel,
    speaking,
    voices,
    browserSupportsSpeechSynthesis,
    setOptions: updateOptions
  };
};
