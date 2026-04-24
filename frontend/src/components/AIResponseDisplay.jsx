import ReactMarkdown from 'react-markdown';
import { Brain, Clock, Cpu, AlertCircle, CheckCircle } from 'lucide-react';

// Strip triple backtick code blocks from AI responses before display
const stripCodeBlocks = (text) => {
  if (!text) return '';
  return text.replace(/```[\w]*\n?[\s\S]*?```/g, '').trim();
};

export default function AIResponseDisplay({ result }) {
  if (!result) return null;

  const { type, content: rawContent, model, processingTime, error } = result;
  const content = error ? rawContent : stripCodeBlocks(rawContent);

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${error ? 'border-red-200' : 'border-gray-200'} overflow-hidden animate-fade-in`}>
      {/* Header */}
      <div className={`px-6 py-4 ${error ? 'bg-red-50' : 'bg-gradient-to-r from-indigo-50 to-purple-50'} border-b`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {error ? (
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <Brain className="h-5 w-5 text-indigo-600" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-800">{type}</h3>
              {model && (
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Cpu className="h-3 w-3" />
                  {model}
                </p>
              )}
            </div>
          </div>
          {processingTime && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              {(processingTime / 1000).toFixed(1)}s
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error ? (
          <div className="text-red-600">{content}</div>
        ) : (
          <div className="ai-response">
            <ReactMarkdown
              components={{
                // Custom heading styles
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-semibold text-gray-700 mt-6 mb-3 flex items-center gap-2">
                    <div className="w-1 h-6 bg-indigo-500 rounded"></div>
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-medium text-gray-600 mt-4 mb-2">{children}</h3>
                ),
                // Custom list styles
                ul: ({ children }) => (
                  <ul className="space-y-2 my-4">{children}</ul>
                ),
                li: ({ children }) => (
                  <li className="flex items-start gap-2 text-gray-600">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{children}</span>
                  </li>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-2 my-4">{children}</ol>
                ),
                // Custom paragraph
                p: ({ children }) => (
                  <p className="text-gray-600 leading-relaxed mb-4">{children}</p>
                ),
                // Custom strong
                strong: ({ children }) => (
                  <strong className="font-semibold text-gray-800">{children}</strong>
                ),
                // Custom code
                code: ({ inline, children }) => (
                  inline ? (
                    <code className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-sm font-mono">
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                      {children}
                    </code>
                  )
                ),
                // Custom blockquote
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-indigo-500 pl-4 py-2 my-4 bg-indigo-50 rounded-r-lg italic text-gray-600">
                    {children}
                  </blockquote>
                ),
                // Custom table
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-gray-50">{children}</thead>
                ),
                th: ({ children }) => (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-3 text-sm text-gray-600 border-t border-gray-100">
                    {children}
                  </td>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Footer */}
      {!error && (
        <div className="px-6 py-3 bg-gray-50 border-t text-sm text-gray-500 flex items-center justify-between">
          <span>Powered by AI</span>
          <span className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Analysis complete
          </span>
        </div>
      )}
    </div>
  );
}
