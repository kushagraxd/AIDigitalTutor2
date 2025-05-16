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

    // Find a female English voice
    const femaleEnglishVoice = voices.find(
      voice => voice.lang.includes('en-US') && 
              (voice.name.toLowerCase().includes('female') || 
               voice.name.toLowerCase().includes('woman'))
    );

    // Find any English voice as fallback
    const englishVoice = voices.find(
      voice => voice.lang.includes('en-US')
    );

    // Apply the best match
    const selectedVoice = femaleEnglishVoice || englishVoice || voices[0];
    
    if (selectedVoice) {
      console.log('Setting voice to:', selectedVoice.name, selectedVoice.lang);
      setOptions({
        voice: selectedVoice,
        // Default rate
        rate: 1.0,
        // Default pitch
        pitch: 1.0
      });
      setIsVoiceSet(true);
    }
  }, [voices, browserSupportsSpeechSynthesis, isVoiceSet, setOptions]);

  // This component doesn't render anything visible
  return null;
}