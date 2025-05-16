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
        
        // Set default voice if not already set
        if (!options.voice) {
          // Try to find an Indian female voice first (looking for Hindi or Indian English voices)
          const indianFemaleVoice = voiceOptions.find(
            voice => (voice.lang.includes('hi-IN') || voice.lang.includes('en-IN')) && 
                    (voice.name.includes('Female') || voice.name.includes('female') || 
                     voice.name.includes('Woman') || voice.name.includes('woman'))
          );
          
          // Next try to find any Indian voice
          const indianVoice = voiceOptions.find(
            voice => voice.lang.includes('hi-IN') || voice.lang.includes('en-IN')
          );
          
          // Then try any female English voice
          const femaleEnglishVoice = voiceOptions.find(
            voice => voice.lang.includes('en') && 
                    (voice.name.includes('Female') || voice.name.includes('female') || 
                     voice.name.includes('Woman') || voice.name.includes('woman'))
          );
          
          // Otherwise find any English voice
          const englishVoice = voiceOptions.find(voice => voice.lang.includes('en'));
          
          // Use the best match we could find
          const defaultVoice = indianFemaleVoice || indianVoice || femaleEnglishVoice || englishVoice || voiceOptions[0];
          
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
    if (!browserSupportsSpeechSynthesis || !text) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply options
    if (options.voice) utterance.voice = options.voice;
    if (options.rate) utterance.rate = options.rate;
    if (options.pitch) utterance.pitch = options.pitch;
    if (options.volume) utterance.volume = options.volume;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
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
