import React, { useEffect, useState } from 'react';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

export default function VoiceSettings() {
  const { voices, setOptions, browserSupportsSpeechSynthesis } = useSpeechSynthesis();
  const [isVoiceSet, setIsVoiceSet] = useState(false);

  // Set up Indian female voice when voices are loaded
  useEffect(() => {
    if (!browserSupportsSpeechSynthesis || voices.length === 0 || isVoiceSet) return;

    // Log available voices for debugging
    console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));

    // Find Indian female voice
    const indianFemaleVoice = voices.find(
      voice => (voice.lang.includes('hi-IN') || voice.lang.includes('en-IN')) && 
              (voice.name.toLowerCase().includes('female') || 
               voice.name.toLowerCase().includes('woman'))
    );

    // Find any Indian voice as fallback
    const indianVoice = voices.find(
      voice => voice.lang.includes('hi-IN') || voice.lang.includes('en-IN')
    );

    // Find any female voice as fallback
    const femaleVoice = voices.find(
      voice => voice.name.toLowerCase().includes('female') || 
              voice.name.toLowerCase().includes('woman')
    );

    // Apply the best match
    const selectedVoice = indianFemaleVoice || indianVoice || femaleVoice || voices[0];
    
    if (selectedVoice) {
      console.log('Setting voice to:', selectedVoice.name, selectedVoice.lang);
      setOptions({
        voice: selectedVoice,
        // Slightly slower rate for better comprehension
        rate: 0.95,
        // Slightly higher pitch for more feminine voice if needed
        pitch: 1.05
      });
      setIsVoiceSet(true);
    }
  }, [voices, browserSupportsSpeechSynthesis, isVoiceSet, setOptions]);

  // This component doesn't render anything visible
  return null;
}