import React, { useState, useEffect, useRef } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Module } from "@shared/schema";
import ChatMessage from "./ChatMessage";
import VoiceModal from "./VoiceModal";
import VoiceSettings from "./VoiceSettings";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";


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

// Helper function to strip markdown and code from text for speech
const stripMarkdownAndCode = (text: string): string => {
  return text
    // Remove code blocks completely
    .replace(/```[\s\S]*?```/g, 'I have shared some code examples in the text.')
    // Remove inline code
    .replace(/`[^`]+`/g, '')
    // Remove markdown formatting
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markers
    .replace(/\*([^*]+)\*/g, '$1')     // Remove italic markers
    .replace(/^#+\s+(.+)$/gm, '$1')    // Remove heading markers
    // Remove markdown links leaving just the text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bullet points and numbered lists but keep the text
    .replace(/^[\s-]*[-•*+][\s]+(.+)$/gm, '$1') // Clean bullet points
    .replace(/^\s*\d+\.\s+(.+)$/gm, '$1')      // Clean numbered list markers
    // Remove technical syntax
    .replace(/{[^}]*}/g, '')
    .replace(/<[^>]+>/g, '')
    // Fix URLs
    .replace(/https?:\/\/\S+/g, 'website link')
    // Clean whitespace
    .replace(/\s+/g, ' ')
    .trim();
};

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
  
  // Browser's built-in speech synthesis (fallback)
  const { speak: speakBrowser, cancel, speaking: speakingBrowser } = useSpeechSynthesis();
  
  // Use browser's speech synthesis status
  const speaking = speakingBrowser;
  const { 
    transcript, 
    isListening, 
    startListening, 
    stopListening, 
    resetTranscript,
    browserSupportsSpeechRecognition 
  } = useSpeechRecognition();
  
  // Function to handle voice input
  const handleVoiceInput = () => {
    if (!browserSupportsSpeechRecognition) {
      toast({
        title: "Not supported",
        description: "Speech recognition is not supported in your browser.",
        variant: "destructive"
      });
      return;
    }
    
    resetTranscript();
    setVoiceModalOpen(true);
    startListening();
  };
  
  // Function to repeat the last AI message
  const handleRepeatMessage = () => {
    if (lastAiMessage && lastAiMessage.speak) {
      // Stop any current speech
      cancel();
      
      // Log for debugging
      console.log("Repeating message:", lastAiMessage.speak);
      
      // Start speaking the last AI message again with a slight delay
      setTimeout(() => {
        toast({
          title: "Repeating last message",
          description: "The AI is repeating the last message.",
        });
        
        // Use browser speech synthesis
        speakBrowser(lastAiMessage.speak);
      }, 200);
    } else {
      console.log("No message to repeat:", lastAiMessage);
      
      toast({
        title: "Nothing to repeat",
        description: "There is no AI message to repeat.",
      });
    }
  };

  // Define mutation for updating module progress
  const updateProgressMutation = useMutation({
    mutationFn: async ({ moduleId, percentComplete, completed }: { moduleId: number, percentComplete: number, completed: boolean }) => {
      return apiRequest("POST", `/api/progress/${moduleId}`, { percentComplete, completed });
    },
    onSuccess: () => {
      // Invalidate progress queries to refresh progress data
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
      if (moduleId) {
        queryClient.invalidateQueries({ queryKey: [`/api/progress/${moduleId}`] });
      }
    }
  });
  
  // Add welcome message on first load and initialize progress tracking
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
      
      // Initialize module progress to at least 10% when a module is loaded
      if (moduleId && user) {
        updateProgressMutation.mutate({
          moduleId,
          percentComplete: 10,
          completed: false
        });
      }
    }
  }, [module, moduleId, user, messages.length, updateProgressMutation]);
  
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
      // Use the special speech text from server or create a simplified version by stripping markdown/code
      const speakText = data.speak || stripMarkdownAndCode(data.reply);
      setLastAiMessage({
        content: data.reply,
        speak: speakText
      });
      
      // Speak the response using browser's built-in speech synthesis
      console.log("Speaking text:", speakText);
      
      // Use a timeout to allow the UI to update before speaking
      setTimeout(() => {
        // Use browser speech synthesis
        speakBrowser(speakText);
      }, 200);
      
      // Invalidate history queries
      queryClient.invalidateQueries({ queryKey: ['/api/history'] });
      if (moduleId) {
        queryClient.invalidateQueries({ queryKey: [`/api/history/${moduleId}`] });
      }
      
      // Update progress when a new AI message is received
      if (moduleId && user) {
        // Calculate progress based on messages - each exchange increases progress by 10%
        // Count AI messages except welcome message
        const aiMessageCount = messages.filter(m => m.type === 'ai' && m.id !== 'welcome').length + 1;
        const percentComplete = Math.min(100, aiMessageCount * 10);
        const completed = percentComplete >= 100;
        
        // Update progress
        updateProgressMutation.mutate({
          moduleId,
          percentComplete,
          completed
        });
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
  
  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputMessage]);
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col flex-grow overflow-hidden">
        <ScrollArea className="flex-grow px-4">
          <div className="space-y-4 py-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
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
        onClose={() => {
          setVoiceModalOpen(false);
          stopListening();
        }}
        onSubmit={() => {
          setVoiceModalOpen(false);
          stopListening();
          setTimeout(handleSendMessage, 300);
        }}
        transcript={transcript}
        isListening={isListening}
      />
    </div>
  );
}