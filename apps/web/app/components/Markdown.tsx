import ReactMarkdown from "react-markdown";
import rehypeSlug from "rehype-slug";

export default function Markdown({ source }: { source: string }) {
  return (
    <div
      className="prose prose-lg max-w-none
      prose-headings:text-[#f7f8f8] prose-headings:font-light prose-headings:mb-4
      prose-p:text-[#d0d6e0] prose-p:mb-4
      prose-a:text-[#7170ff] prose-a:no-underline hover:prose-a:text-[#828fff]
      prose-code:text-[#d0d6e0] prose-code:bg-[#191a1b] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
      prose-pre:bg-[#191a1b] prose-pre:border prose-pre:border-[#23252a] prose-pre:rounded-lg
      prose-pre code:bg-transparent prose-pre code:p-0 prose-pre code:text-sm
      prose-blockquote:border-l-[#23252a] prose-blockquote:text-[#a0a4a8]
      prose-ul:text-[#d0d6e0] prose-ol:text-[#d0d6e0]"
    >
      <ReactMarkdown rehypePlugins={[rehypeSlug]}>{source}</ReactMarkdown>
    </div>
  );
}
