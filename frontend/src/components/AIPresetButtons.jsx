import React from 'react';

export default function AIPresetButtons({ examples, onFill, prerequisite }) {
  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm">
      <p className="font-medium text-indigo-900">Fill a sample scenario</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {examples.map((example, index) => (
          <button key={example.label} type="button" onClick={() => onFill(example, index)}
            className="rounded border border-indigo-300 bg-white px-3 py-1.5 text-indigo-800 hover:bg-indigo-100">
            {example.label}
          </button>
        ))}
      </div>
      {prerequisite && <p className="mt-2 text-amber-800">{prerequisite}</p>}
    </div>
  );
}
