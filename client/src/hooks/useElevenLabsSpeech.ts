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
    if (!text || !currentVoiceId) {
      throw new Error('Missing text or voice ID for speech synthesis');
    }
    
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
      
      console.log(`Requesting speech synthesis for ${text.length} characters with voice ID ${currentVoiceId}`);
      
      // Make API request to get speech audio
      const response = await apiRequest('POST', '/api/tts', {
        text,
        voiceId: currentVoiceId,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned error: ${response.status} - ${errorText}`);
      }
      
      // Create URL for the audio blob
      const audioBlob = await response.blob();
      if (audioBlob.size === 0) {
        throw new Error('Received empty audio blob from server');
      }
      
      console.log(`Received audio blob of size: ${audioBlob.size} bytes`);
      
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      // Configure audio element
      audioRef.current.src = url;
      audioRef.current.onplay = () => setIsSpeaking(true);
      audioRef.current.onended = () => setIsSpeaking(false);
      audioRef.current.onpause = () => setIsSpeaking(false);
      audioRef.current.onerror = (e) => {
        const error = e.currentTarget as HTMLAudioElement;
        console.error('Audio playback error:', error.error);
        setIsSpeaking(false);
        toast({
          title: 'Playback Error',
          description: `Failed to play audio: ${error.error?.message || 'Unknown error'}`,
          variant: 'destructive',
        });
      };
      
      // Play audio if autoPlay is enabled
      if (autoPlay) {
        try {
          await audioRef.current.play();
        } catch (playError) {
          console.error('Error playing audio:', playError);
          throw new Error(`Failed to play audio: ${playError.message}`);
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error generating speech:', error);
      setIsLoading(false);
      toast({
        title: 'Speech Generation Failed',
        description: `${error.message || 'There was an error generating the speech audio.'}`,
        variant: 'destructive',
      });
      
      // Re-throw the error so the caller can handle it (e.g., fallback to browser speech)
      throw error;
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