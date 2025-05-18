import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface FeedbackButtonsProps {
  messageId: string;
  onFeedbackSubmitted?: (messageId: string, isHelpful: boolean) => void;
}

export default function FeedbackButtons({ messageId, onFeedbackSubmitted }: FeedbackButtonsProps) {
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<'helpful' | 'not-helpful' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const submitFeedback = async (isHelpful: boolean) => {
    setIsSubmitting(true);
    try {
      await apiRequest('POST', '/api/feedback', {
        messageId,
        isHelpful,
        timestamp: new Date().toISOString()
      });
      
      setFeedbackSubmitted(isHelpful ? 'helpful' : 'not-helpful');
      
      toast({
        title: 'Feedback Submitted',
        description: 'Thank you for your feedback. This helps the AI improve.',
      });
      
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(messageId, isHelpful);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (feedbackSubmitted) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
        <span>
          {feedbackSubmitted === 'helpful' 
            ? 'You found this helpful' 
            : 'You found this not helpful'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="text-xs text-muted-foreground mr-1">Was this helpful?</div>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
        onClick={() => submitFeedback(true)}
        disabled={isSubmitting}
      >
        <ThumbsUp size={14} className="mr-1" />
        <span className="text-xs">Yes</span>
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={() => submitFeedback(false)}
        disabled={isSubmitting}
      >
        <ThumbsDown size={14} className="mr-1" />
        <span className="text-xs">No</span>
      </Button>
    </div>
  );
}