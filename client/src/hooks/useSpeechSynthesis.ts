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
    
    // Break longer text into sentences to improve speech synthesis reliability
    // The Speech API can have issues with very long text
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    console.log(`Speaking text (${sentences.length} sentences)`);
    setSpeaking(true);
    
    // Function to speak each sentence with a small delay
    const speakSentences = (index = 0) => {
      if (index >= sentences.length) {
        setSpeaking(false);
        return;
      }
      
      const sentence = sentences[index].trim();
      if (!sentence) {
        speakSentences(index + 1);
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(sentence);
      
      // Apply options
      if (options.voice) utterance.voice = options.voice;
      if (options.rate) utterance.rate = options.rate;
      if (options.pitch) utterance.pitch = options.pitch;
      if (options.volume) utterance.volume = options.volume;

      utterance.onend = () => {
        speakSentences(index + 1);
      };
      
      utterance.onerror = (e) => {
        console.error("Speech synthesis error:", e);
        speakSentences(index + 1);
      };

      window.speechSynthesis.speak(utterance);
    };
    
    // Start speaking the sentences
    speakSentences();
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
