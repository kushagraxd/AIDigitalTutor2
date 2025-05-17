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
    
    // Clean any potential "dot" issues from the text and prepare for speech
    const cleanedText = text
      .replace(/\.\s+/g, '. ') // Fix any "dot" issues by ensuring proper space after periods
      .replace(/\s+\./g, '.') // Remove spaces before periods
      .replace(/\s+,/g, ',') // Remove spaces before commas
      .replace(/\.\./g, '.') // Replace double periods with single
      .replace(/\bdot\b/gi, ''); // Remove standalone "dot" words
      
    // Process text to add SSML-like improvements for better prosody
    // Even though most browsers don't support SSML directly, we can simulate
    // some effects with careful text manipulation
    
    // Add natural pauses for commas, periods, etc. without pronouncing the word "dot"
    const processedText = cleanedText
      .replace(/\.\s+/g, '. <break time="0.5s"/> ') // Natural pauses at end of sentences
      .replace(/\!\s+/g, '! <break time="0.6s"/> ') // Emphasis after exclamations
      .replace(/\?\s+/g, '? <break time="0.6s"/> ') // Pause after questions
      .replace(/,\s+/g, ', <break time="0.3s"/> ') // Short pauses for commas
      .replace(/:\s+/g, ': <break time="0.4s"/> ') // Pauses for colons
      .replace(/\s-\s/g, ' <break time="0.2s"/> - <break time="0.2s"/> ') // Slight pause for hyphens
      .replace(/(\d+)\./g, '$1 <break time="0.3s"/> '); // Pauses after numbered lists
    
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
      
      // Get the current chunk and process SSML-like tags
      let chunk = breathChunks[index].trim();
      if (!chunk) {
        speakWithProsody(index + 1);
        return;
      }
      
      // Process the chunk to handle SSML-like tags
      // Replace SSML break tags with actual spaces for pauses
      chunk = chunk.replace(/<break time="([\d.]+)s"\/>/g, (match, time) => {
        const pauseLength = Math.round(parseFloat(time) * 5);
        return ' '.repeat(pauseLength);
      });
      
      // Remove any remaining tags
      chunk = chunk.replace(/<[^>]+>/g, '');
      
      // Remove any remaining "dot" text that might be pronounced
      chunk = chunk.replace(/\bdot\b/gi, '');
      
      const utterance = new SpeechSynthesisUtterance(chunk);
      
      // Dynamically adjust rate for different sentence types to sound more natural
      // Use a slightly slower default rate for more natural speech
      let chunkRate = (options.rate || 0.9);
      
      // Questions tend to be spoken a bit more slowly with rising intonation
      if (chunk.endsWith('?')) {
        chunkRate *= 0.9; 
        utterance.pitch = (options.pitch || 1) * 1.05; // Slightly higher pitch for questions
      }
      
      // Exclamations often have more emphasis
      if (chunk.endsWith('!')) {
        chunkRate *= 0.95;
        utterance.pitch = (options.pitch || 1) * 1.1; // Higher pitch for exclamations
      }
      
      // Apply options
      if (options.voice) utterance.voice = options.voice;
      utterance.rate = chunkRate;
      if (options.pitch && !chunk.endsWith('?') && !chunk.endsWith('!')) {
        utterance.pitch = options.pitch;
      }
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
