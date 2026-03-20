"use client";

import { Globe, Twitter } from "lucide-react";
import { useState } from "react";

type BlogArticleActionsProps = {
  shareUrl: string;
  title: string;
};

export default function BlogArticleActions({ shareUrl, title }: BlogArticleActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
    shareUrl
  )}&text=${encodeURIComponent(title)}`;

  return (
    <div className="flex items-center gap-4 text-sm text-white/70">
      <button
        type="button"
        onClick={handleCopy}
        className="transition hover:text-white"
      >
        {copied ? "Copied" : "Copy Link"}
      </button>
      <a
        href={twitterUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on X"
        className="transition hover:text-white"
      >
        <Twitter className="h-4 w-4" />
      </a>
      <a
        href={shareUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Open article link"
        className="transition hover:text-white"
      >
        <Globe className="h-4 w-4" />
      </a>
    </div>
  );
}

