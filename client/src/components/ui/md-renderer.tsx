import React from "react";
import MarkdownIt from "markdown-it";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  if (!content) {
    return null;
  }

  const renderedHtml = md.render(content);

  return (
    <div 
      className={cn("prose prose-sm max-w-none dark:prose-invert prose-headings:font-heading prose-headings:font-semibold", className)}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}
