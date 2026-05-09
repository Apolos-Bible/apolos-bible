import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/cn';

type MarkdownProps = {
  children: string;
  className?: string;
};

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cn('text-sm leading-relaxed text-text-primary space-y-2', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ node: _n, ...props }) => <p className="m-0" {...props} />,
          a: ({ node: _n, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2 hover:opacity-80"
            />
          ),
          strong: ({ node: _n, ...props }) => (
            <strong className="font-semibold text-text-primary" {...props} />
          ),
          em: ({ node: _n, ...props }) => <em className="italic" {...props} />,
          code: ({ node: _n, className: c, ...props }) => {
            const isBlock = /language-/.test(c ?? '');
            return isBlock ? (
              <code
                className="block bg-bg-secondary border border-border rounded-md px-2 py-1.5 text-2xs font-mono overflow-x-auto"
                {...props}
              />
            ) : (
              <code
                className="bg-bg-secondary border border-border rounded px-1 py-0.5 text-2xs font-mono"
                {...props}
              />
            );
          },
          pre: ({ node: _n, ...props }) => <pre className="m-0" {...props} />,
          ul: ({ node: _n, ...props }) => (
            <ul className="list-disc pl-5 space-y-1 marker:text-text-muted" {...props} />
          ),
          ol: ({ node: _n, ...props }) => (
            <ol className="list-decimal pl-5 space-y-1 marker:text-text-muted" {...props} />
          ),
          li: ({ node: _n, ...props }) => <li className="leading-snug" {...props} />,
          h1: ({ node: _n, ...props }) => (
            <h1 className="text-sm font-semibold text-text-primary mt-2" {...props} />
          ),
          h2: ({ node: _n, ...props }) => (
            <h2 className="text-sm font-semibold text-text-primary mt-2" {...props} />
          ),
          h3: ({ node: _n, ...props }) => (
            <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wide mt-2" {...props} />
          ),
          blockquote: ({ node: _n, ...props }) => (
            <blockquote
              className="border-l-2 border-accent/40 pl-3 text-text-secondary italic"
              {...props}
            />
          ),
          hr: () => <hr className="border-border my-2" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
