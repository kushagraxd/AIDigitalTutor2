import React, { useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  transcript: string;
  isListening: boolean;
}

export default function VoiceModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  transcript, 
  isListening 
}: VoiceModalProps) {
  // Auto-submit when user stops speaking after a period of time
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (transcript && isListening) {
      timeout = setTimeout(() => {
        if (transcript.trim()) {
          onSubmit();
        }
      }, 1500); // 1.5 seconds of silence = auto-submit
    }
    
    return () => clearTimeout(timeout);
  }, [transcript, isListening, onSubmit]);
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <div className="text-center">
          <div className={`w-20 h-20 rounded-full bg-primary mx-auto flex items-center justify-center ${isListening ? 'voice-pulse' : ''}`}>
            <span className="material-icons text-white text-3xl">mic</span>
          </div>
          
          <p className="mt-4 text-lg font-medium text-neutral-dark">
            {isListening ? "Listening..." : "Processing..."}
          </p>
          
          <p className="text-sm text-neutral-gray mt-1">
            {isListening ? "Speak clearly into your microphone" : "Almost done..."}
          </p>
          
          {transcript && (
            <div className="mt-4 p-3 bg-muted rounded-md text-sm text-left max-h-24 overflow-y-auto">
              {transcript}
            </div>
          )}
          
          <div className="mt-6 flex space-x-2">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={onClose}
            >
              Cancel
            </Button>
            
            {transcript && (
              <Button 
                className="flex-1" 
                onClick={onSubmit}
              >
                Send
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
