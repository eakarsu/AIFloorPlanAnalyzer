import { useState } from 'react';
import { Download, FileText, Table, Loader2 } from 'lucide-react';

export default function ExportButton({ data, filename, type = 'json' }) {
  const [exporting, setExporting] = useState(false);

  const exportToJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${filename}.json`);
  };

  const exportToCSV = () => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          let cell = row[header];
          if (cell === null || cell === undefined) cell = '';
          if (typeof cell === 'object') cell = JSON.stringify(cell);
          cell = String(cell).replace(/"/g, '""');
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            cell = `"${cell}"`;
          }
          return cell;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${filename}.csv`);
  };

  const exportToPDF = () => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]).filter(h =>
      !['image_data', 'image_url', 'full_result', 'password', 'email_verification_token'].includes(h)
    );

    const colWidths = headers.map(h => Math.max(h.length * 7, 60));
    const totalWidth = colWidths.reduce((a, b) => a + b, 0) + 40;
    const pageWidth = Math.max(totalWidth, 800);

    let html = `<!DOCTYPE html><html><head><title>${filename}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; }
      h1 { color: #4F46E5; font-size: 18px; margin-bottom: 5px; }
      p.meta { color: #6B7280; font-size: 10px; margin-bottom: 15px; }
      table { border-collapse: collapse; width: 100%; }
      th { background: #4F46E5; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
      td { padding: 5px 8px; border-bottom: 1px solid #E5E7EB; font-size: 10px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      tr:nth-child(even) { background: #F9FAFB; }
      tr:hover { background: #EEF2FF; }
      @media print { body { margin: 10px; } }
    </style></head><body>`;
    html += `<h1>${filename.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</h1>`;
    html += `<p class="meta">Exported on ${new Date().toLocaleString()} | ${data.length} records</p>`;
    html += '<table><thead><tr>';
    headers.forEach(h => {
      html += `<th>${h.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</th>`;
    });
    html += '</tr></thead><tbody>';
    data.forEach(row => {
      html += '<tr>';
      headers.forEach(h => {
        let val = row[h];
        if (val === null || val === undefined) val = '';
        if (typeof val === 'object') val = JSON.stringify(val).substring(0, 100);
        if (typeof val === 'boolean') val = val ? 'Yes' : 'No';
        html += `<td>${String(val).substring(0, 100)}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></body></html>';

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const downloadBlob = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (exportType) => {
    setExporting(true);
    try {
      if (exportType === 'json') {
        exportToJSON();
      } else if (exportType === 'csv') {
        exportToCSV();
      } else if (exportType === 'pdf') {
        exportToPDF();
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative inline-block">
      <div className="flex gap-2">
        <button
          onClick={() => handleExport('csv')}
          disabled={exporting || !data || data.length === 0}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
          title="Export as CSV"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Table className="h-4 w-4" />
          )}
          CSV
        </button>
        <button
          onClick={() => handleExport('pdf')}
          disabled={exporting || !data || data.length === 0}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
          title="Export as PDF"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          PDF
        </button>
        <button
          onClick={() => handleExport('json')}
          disabled={exporting || !data || data.length === 0}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
          title="Export as JSON"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          JSON
        </button>
      </div>
    </div>
  );
}
