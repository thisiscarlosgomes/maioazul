"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ChatMarkdownContentProps = {
  content: string;
};

export default function ChatMarkdownContent({ content }: ChatMarkdownContentProps) {
  return (
    <div className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:my-2 prose-li:my-1 prose-strong:font-semibold prose-headings:font-semibold prose-headings:text-[#111111] prose-p:text-[#111111] prose-li:text-[#111111]">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
