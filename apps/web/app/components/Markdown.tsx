import ReactMarkdown from "react-markdown";
import rehypeSlug from "rehype-slug";

export default function Markdown({ source }: { source: string }) {
  return (
    <div className="prose prose-zinc dark:prose-invert max-w-none [&_pre]:bg-zinc-100 dark:[&_pre]:bg-zinc-900 [&_pre]:p-3 [&_pre]:rounded [&_code]:font-mono [&_a]:underline">
      <ReactMarkdown rehypePlugins={[rehypeSlug]}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
