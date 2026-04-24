export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-6 py-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: cols }).map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4">
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-full"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="w-16 h-6 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
          <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-100 rounded animate-pulse w-full mb-2"></div>
          <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3"></div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
            <div className="flex gap-2">
              <div className="w-8 h-8 bg-gray-100 rounded animate-pulse"></div>
              <div className="w-8 h-8 bg-gray-100 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-5 bg-gray-200 rounded animate-pulse w-24 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded animate-pulse w-16 mb-2"></div>
          <div className="h-4 bg-gray-100 rounded animate-pulse w-32"></div>
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
        <div>
          <div className="h-8 bg-gray-200 rounded animate-pulse w-48 mb-2"></div>
          <div className="h-4 bg-gray-100 rounded animate-pulse w-64"></div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
      </div>
    </div>
  );
}

export default {
  TableSkeleton,
  CardSkeleton,
  StatsSkeleton,
  DetailSkeleton
};
