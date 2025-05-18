import React, { useState, useEffect, useRef } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Module, ChatHistory } from "@shared/schema";
import ChatMessage from "./ChatMessage";
import { Send } from "lucide-react";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
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
  
  // Fetch existing chat history for this module
  const { data: chatHistory } = useQuery<ChatHistory[]>({
    queryKey: [`/api/history/${moduleId}`],
    enabled: !!moduleId && !!user,
  });

  // Add welcome message on first load or load from chat history
  useEffect(() => {
    if (!messages.length) {
      if (chatHistory && chatHistory.length > 0) {
        // Convert chat history to message format
        const formattedMessages: Message[] = [];
        for (const entry of chatHistory) {
          // Add user message
          formattedMessages.push({
            id: `user-${entry.id}`,
            type: 'user',
            content: entry.question,
            timestamp: new Date(entry.timestamp ?? Date.now())
          });
          
          // Add AI response
          formattedMessages.push({
            id: `ai-${entry.id}`,
            type: 'ai',
            content: entry.answer,
            timestamp: new Date(entry.timestamp ?? Date.now()),
            markdown: true,
            confidence: entry.confidenceScore ? Number(entry.confidenceScore) : undefined,
            source: entry.source ? String(entry.source) : undefined
          });
        }
        setMessages(formattedMessages);
      } else {
        // No history, show welcome message
        const welcomeContent = `# Welcome to the ${module?.title || 'Digital Marketing'} module!

I'm your AI Digital Marketing Professor, designed to help you understand digital marketing concepts and strategies specifically for the Indian market.

## How I can help you:
- Ask me questions about ${module?.title || 'digital marketing'} topics
- Request examples relevant to Indian businesses
- Get help with practical applications
- Explore case studies and success stories

After each topic, I'll check if you've understood the concept before moving on. Let's make your learning experience interactive and effective!

What specific aspect of ${module?.title || 'digital marketing'} would you like to explore first?`;

        const welcomeMessage = {
          id: 'welcome',
          type: 'ai' as const,
          content: welcomeContent,
          timestamp: new Date(),
          markdown: true
        };
        setMessages([welcomeMessage]);
        
        // Initialize module progress to at least 10% when a module is loaded
        if (moduleId && user) {
          updateProgressMutation.mutate({
            moduleId,
            percentComplete: 10,
            completed: false
          });
        }
      }
    }
  }, [chatHistory, messages.length, module, moduleId, updateProgressMutation, user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "0px";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 120) + "px";
    }
  }, [inputMessage]);

  // Handle send message
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    // Define userMessage
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };
    
    // Add user message to messages
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input
    setInputMessage("");
    
    try {
      // Prepare request object - Include module information if available
      const requestData = {
        question: inputMessage,
        moduleId: moduleId,
        previousMessages: messages.map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.content
        }))
      };
      
      // Send request to the API
      const response = await apiRequest("POST", "/api/chat", requestData);
      const data = response;
      
      // Parse AI response
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: typeof data === 'object' && data.reply ? data.reply : String(data),
        timestamp: new Date(),
        markdown: true,
        confidence: typeof data === 'object' ? data.confidence : undefined,
        source: typeof data === 'object' ? data.source : undefined
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
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
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-grow px-4 py-6">
        <div className="space-y-6 max-w-3xl mx-auto">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <div className="bg-white rounded-lg shadow-sm p-3 mt-2">
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
          <div className="flex items-center ml-3">
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className="rounded-full h-9 w-9 bg-primary hover:bg-primary/90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}