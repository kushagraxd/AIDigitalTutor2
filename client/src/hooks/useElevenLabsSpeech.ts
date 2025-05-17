import { useState, useEffect, useRef } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface UseElevenLabsSpeechOptions {
  voiceId?: string;
  autoPlay?: boolean;
}

interface ElevenLabsVoice {
  id: string;
  name: string;
  description: string;
}

/**
 * Custom hook for handling Eleven Labs text-to-speech
 */
export const useElevenLabsSpeech = (options: UseElevenLabsSpeechOptions = {}) => {
  const { voiceId: initialVoiceId, autoPlay = false } = options;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [currentVoiceId, setCurrentVoiceId] = useState<string | undefined>(initialVoiceId);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch available voices on mount
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await apiRequest('GET', '/api/tts/voices');
        const voicesData = await response.json();
        setVoices(voicesData);
        
        // Set default voice if not provided
        if (!currentVoiceId && voicesData.length > 0) {
          setCurrentVoiceId(voicesData[0].id);
        }
      } catch (error) {
        console.error('Error fetching voices:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch available voices',
          variant: 'destructive',
        });
      }
    };
    
    fetchVoices();
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
      }
    };
  }, [audioUrl]);

  // Function to speak text
  const speak = async (text: string): Promise<void> => {
    if (!text || !currentVoiceId) return;
    
    try {
      setIsLoading(true);
      
      // Create a new audio element if needed
      if (!audioRef.current) {
        audioRef.current = new Audio();
      } else {
        // Stop any currently playing audio
        audioRef.current.pause();
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
          setAudioUrl(null);
        }
      }
      
      // Make API request to get speech audio
      const response = await apiRequest('POST', '/api/tts', {
        text,
        voiceId: currentVoiceId,
      });
      
      // Create URL for the audio blob
      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      // Configure audio element
      audioRef.current.src = url;
      audioRef.current.onplay = () => setIsSpeaking(true);
      audioRef.current.onended = () => setIsSpeaking(false);
      audioRef.current.onpause = () => setIsSpeaking(false);
      audioRef.current.onerror = () => {
        setIsSpeaking(false);
        toast({
          title: 'Error',
          description: 'Failed to play audio',
          variant: 'destructive',
        });
      };
      
      // Play audio if autoPlay is enabled
      if (autoPlay) {
        await audioRef.current.play();
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error generating speech:', error);
      setIsLoading(false);
      toast({
        title: 'Speech Generation Failed',
        description: 'There was an error generating the speech audio.',
        variant: 'destructive',
      });
    }
  };

  // Play the current audio
  const play = async (): Promise<void> => {
    if (audioRef.current && audioUrl) {
      try {
        await audioRef.current.play();
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }
  };

  // Pause the current audio
  const pause = (): void => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  // Stop and reset the current audio
  const stop = (): void => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Change the current voice
  const setVoice = (voiceId: string): void => {
    setCurrentVoiceId(voiceId);
  };

  return {
    speak,
    play,
    pause,
    stop,
    setVoice,
    isSpeaking,
    isLoading,
    voices,
    currentVoiceId,
  };
};