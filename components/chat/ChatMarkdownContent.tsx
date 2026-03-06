type ChatMarkdownContentProps = {
  content: string;
};

import { Streamdown } from "streamdown";

export default function ChatMarkdownContent({ content }: ChatMarkdownContentProps) {
  return (
    <Streamdown
      className="space-y-1.5 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-[15px] [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:space-y-0.5 [&_p]:leading-6 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:text-left [&_ul]:list-disc [&_ul]:space-y-1 [&_li]:my-0 [&_li]:leading-6 [&_li+li]:mt-0.5 [&_li>p]:my-0 [&_code]:whitespace-pre-wrap [&_code]:break-words [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_code]:py-0.5 [&_pre]:max-w-full [&_pre]:overflow-x-auto dark:[&_code]:bg-white/10"
      components={{
        ul: ({ children }) => <ul className="list-inside list-disc whitespace-normal [li_&]:pl-6">{children}</ul>,
        ol: ({ children }) => <ol className="list-inside list-decimal whitespace-normal">{children}</ol>,
        li: ({ children }) => <li className="my-0 leading-6">{children}</li>,
        p: ({ children }) => <p className="leading-6 mb-3">{children}</p>,
        a: (props) => (
          <a
            {...props}
            className="underline decoration-[1.5px] underline-offset-2"
            rel="noreferrer noopener"
            target="_blank"
          />
        ),
        strong: ({ children }) => <span>{children}</span>,
      }}
    >
      {/*
        Streamdown is the same renderer used in Vercel's chatbot.
        We keep strong->span to disable bold styling intentionally.
      */}
      {content}
    </Streamdown>
  );
}
