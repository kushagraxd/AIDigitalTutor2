import { useState, useCallback, useEffect } from 'react';

interface SpeechRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
}

interface UseSpeechRecognitionReturn {
  transcript: string;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  browserSupportsSpeechRecognition: boolean;
  error?: string;
}

// Define SpeechRecognition with browser prefixes
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export const useSpeechRecognition = (options: SpeechRecognitionOptions = {}): UseSpeechRecognitionReturn => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [recognition, setRecognition] = useState<any | null>(null);

  const browserSupportsSpeechRecognition = !!SpeechRecognition;

  // Initialize speech recognition
  useEffect(() => {
    if (!browserSupportsSpeechRecognition) return;

    const recognitionInstance = new SpeechRecognition();
    
    // Configure with options
    recognitionInstance.continuous = options.continuous ?? false;
    recognitionInstance.interimResults = options.interimResults ?? true;
    recognitionInstance.lang = options.language ?? 'en-US';
    
    // Set up event handlers
    recognitionInstance.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);
    };

    recognitionInstance.onerror = (event: any) => {
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    setRecognition(recognitionInstance);

    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, [browserSupportsSpeechRecognition, options.continuous, options.interimResults, options.language]);

  const startListening = useCallback(() => {
    if (!recognition) return;
    
    setError(undefined);
    setIsListening(true);
    
    try {
      recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setError('Failed to start speech recognition');
      setIsListening(false);
    }
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (!recognition) return;
    
    try {
      recognition.stop();
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
    
    setIsListening(false);
  }, [recognition]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    transcript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    error
  };
};
