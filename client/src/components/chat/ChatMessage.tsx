import React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MarkdownRenderer } from "@/components/ui/md-renderer";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatMessageProps {
  message: {
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: Date;
    markdown?: boolean;
    confidence?: number;
    source?: string;
  };
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const { user } = useAuth();
  
  if (message.type === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="mr-3 p-3 bg-primary text-white rounded-lg shadow-sm max-w-[80%]">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.profileImageUrl} alt={user?.firstName || "User"} />
          <AvatarFallback>
            {user?.firstName?.[0] || user?.email?.[0] || "U"}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }
  
  return (
    <div className="flex mb-4">
      <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center">
        <span className="material-icons text-white text-sm">smart_toy</span>
      </div>
      <div className="ml-3 p-3 bg-white rounded-lg shadow-sm max-w-[85%]">
        <div className="text-sm text-neutral-dark">
          {message.markdown ? (
            <MarkdownRenderer content={message.content} />
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
        
        {(message.confidence !== undefined || message.source) && (
          <div className="flex mt-3 text-xs text-neutral-gray items-center">
            <span className="flex items-center">
              <span className="material-icons text-xs mr-1">info</span>
              <span>
                Source: {message.source || "AI"} 
                {message.confidence !== undefined && ` (${Math.round(message.confidence * 100)}% confidence)`}
              </span>
            </span>
            <div className="ml-auto flex space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                      <span className="material-icons text-sm">thumb_up</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This was helpful</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                      <span className="material-icons text-sm">thumb_down</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This was not helpful</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
