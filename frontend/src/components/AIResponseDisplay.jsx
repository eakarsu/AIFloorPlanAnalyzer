import { Brain, Clock, Cpu, AlertCircle, CheckCircle } from 'lucide-react';
import FormattedAIReport from './FormattedAIReport';

export default function AIResponseDisplay({ result }) {
  if (!result) return null;

  const { type, content: rawContent, model, processingTime, error } = result;
  const content = rawContent;

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
            <FormattedAIReport response={content} title={type || 'AI report'} model={model} />
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
