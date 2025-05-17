import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Module } from "@shared/schema";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatMessage from "./ChatMessage";
import VoiceModal from "./VoiceModal";
import VoiceSettings from "./VoiceSettings";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatInterfaceProps {
  moduleId?: number;
  module?: Module;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  markdown?: boolean;
  confidence?: number;
  source?: string;
}

export default function ChatInterface({ moduleId, module }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [lastAiMessage, setLastAiMessage] = useState<{content: string, speak: string} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { speak, cancel, speaking } = useSpeechSynthesis();
  const { 
    transcript, 
    isListening, 
    startListening, 
    stopListening, 
    resetTranscript,
    browserSupportsSpeechRecognition 
  } = useSpeechRecognition();
  
  // Function to repeat the last AI message
  const handleRepeatMessage = () => {
    if (lastAiMessage && lastAiMessage.speak) {
      // Stop any current speech
      cancel();
      
      // Log for debugging
      console.log("Repeating message:", lastAiMessage.speak);
      
      // Start speaking the last AI message again with a slight delay
      setTimeout(() => {
        speak(lastAiMessage.speak);
        
        toast({
          title: "Repeating last message",
          description: "The AI is repeating the last message.",
        });
      }, 200);
    } else {
      console.log("No message to repeat:", lastAiMessage);
      
      toast({
        title: "Nothing to repeat",
        description: "There is no previous AI message to repeat.",
        variant: "destructive"
      });
    }
  };

  // Add welcome message on first load
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeContent = `# Welcome to the ${module?.title || 'Digital Marketing'} module!

I'm your AI Digital Marketing Professor, designed to help you understand digital marketing concepts and strategies specifically for the Indian market.

## How I can help you:
- Ask me questions about ${module?.title || 'digital marketing'} topics
- Request examples relevant to Indian businesses
- Get help with practical applications
- Explore case studies and success stories

What would you like to learn about today?`;

      const welcomeMessage = {
        id: 'welcome',
        type: 'ai' as const,
        content: welcomeContent,
        timestamp: new Date(),
        markdown: true
      };
      setMessages([welcomeMessage]);
      
      // Set initial welcome message for repeat functionality
      setLastAiMessage({
        content: welcomeContent,
        speak: "Welcome to the Digital Marketing module! I'm your AI Digital Marketing Professor, designed to help you understand digital marketing concepts and strategies specifically for the Indian market. What would you like to learn about today?"
      });
    }
  }, [module]);
  
  // Mutation for sending messages to AI
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest("POST", "/api/ai/chat", {
        question: message,
        moduleId: moduleId,
        context: messages.slice(-5).map(m => `${m.type}: ${m.content}`).join('\n')
      });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      
      // Add AI response to messages
      const aiMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: data.reply,
        timestamp: new Date(),
        markdown: true,
        confidence: data.confidence,
        source: data.source
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Save last AI message for repeat functionality
      const speakText = data.speak || data.reply;
      setLastAiMessage({
        content: data.reply,
        speak: speakText
      });
      
      // Speak the response
      console.log("Speaking text:", speakText);
      setTimeout(() => speak(speakText), 200);
      
      // Invalidate history queries
      queryClient.invalidateQueries({ queryKey: ['/api/history'] });
      if (moduleId) {
        queryClient.invalidateQueries({ queryKey: [`/api/history/${moduleId}`] });
      }
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Update input when transcript changes
  useEffect(() => {
    if (transcript) {
      setInputMessage(transcript);
    }
  }, [transcript]);
  
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    // Add user message to messages
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input
    setInputMessage("");
    
    // Send to AI
    sendMessageMutation.mutate(userMessage.content);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleVoiceInput = () => {
    if (!browserSupportsSpeechRecognition) {
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser doesn't support speech recognition.",
        variant: "destructive"
      });
      return;
    }
    
    setVoiceModalOpen(true);
    resetTranscript();
    startListening();
  };
  
  const handleVoiceModalClose = () => {
    stopListening();
    setVoiceModalOpen(false);
  };
  
  const handleVoiceModalSubmit = () => {
    stopListening();
    setVoiceModalOpen(false);
    
    if (transcript.trim()) {
      setInputMessage(transcript);
      setTimeout(() => handleSendMessage(), 100);
    }
  };
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputMessage]);
  
  return (
    <>
      <div className="flex-grow flex flex-col p-4 overflow-hidden">
        <ScrollArea className="flex-grow pr-4 chat-container">
          <div className="space-y-4 pb-4">
            {messages.map((message) => (
              <ChatMessage 
                key={message.id}
                message={message} 
              />
            ))}
            
            {sendMessageMutation.isPending && (
              <div className="flex">
                <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center">
                  <span className="material-icons text-white text-sm">smart_toy</span>
                </div>
                <div className="ml-3 p-3 bg-white rounded-lg shadow-sm">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0s" }}></div>
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <div className="bg-white rounded-lg shadow-sm p-3 mt-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">
              <span className="flex items-center">
                <span className="mr-1 text-green-500">
                  <span className="material-icons text-sm">
                    {speaking ? "volume_up" : "volume_down"}
                  </span>
                </span>
                {speaking ? "AI speaking..." : "AI ready"}
              </span>
            </div>
            <VoiceSettings />
          </div>
          
          <div className="flex items-end">
            <div className="flex-grow">
              <Textarea
                ref={textareaRef}
                id="user-input"
                placeholder="Type your message here..."
                className="min-h-[40px] max-h-[120px] border-0 focus-visible:ring-0 resize-none text-sm"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
            </div>
            <div className="flex items-center space-x-2 ml-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleRepeatMessage}
                    disabled={!lastAiMessage || speaking}
                    aria-label="Repeat last message"
                  >
                    <span className="material-icons">replay</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Repeat last AI message</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleVoiceInput}
                    disabled={sendMessageMutation.isPending}
                    aria-label="Voice input"
                  >
                    <span className="material-icons">mic</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Voice input</p>
                </TooltipContent>
              </Tooltip>
              
              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || sendMessageMutation.isPending}
                aria-label="Send message"
              >
                <span className="material-icons">send</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <VoiceModal
        isOpen={voiceModalOpen}
        onClose={handleVoiceModalClose}
        onSubmit={handleVoiceModalSubmit}
        transcript={transcript}
        isListening={isListening}
      />
    </>
  );
}
