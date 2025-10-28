"use client";
import { useState } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import Select from "react-select";

export default function Report({ data }: { data: any[] }) {
  const [usdToAed, setUsdToAed] = useState(3.67);
  const [rows, setRows] = useState(
    data.map((row) => ({ ...row, partnerPercent: 50 }))
  );

  const [selectedNames, setSelectedNames] = useState<string[]>([]);

const handlePartnerChange = (login: string, value: number) => {
  const newRows = rows.map((r) =>
    r.Login === login ? { ...r, partnerPercent: value } : r
  );
  setRows(newRows);
};


  // Filter rows based on selected names
  const filteredRows = selectedNames.length
    ? rows.filter((r) => selectedNames.includes(r.Name))
    : rows;

  const enhanced = filteredRows.map((r) => {
    const credit = parseFloat(r.Credit || 0);
    const equity = parseFloat(r.Equity || 0);
    const pil = credit - equity;
    const pilAed = pil * usdToAed;
    const partnerShare = pilAed * (r.partnerPercent / 100);
    const netAfterPartner = pilAed - partnerShare;
    return { ...r, pil, pilAed, partnerShare, netAfterPartner };
  });

  const totals = enhanced.reduce(
    (acc, r) => {
      acc.pil += r.pil;
      acc.pilAed += r.pilAed;
      acc.partnerShare += r.partnerShare;
      acc.netAfterPartner += r.netAfterPartner;
      return acc;
    },
    { pil: 0, pilAed: 0, partnerShare: 0, netAfterPartner: 0 }
  );

  // Export to Excel using ExcelJS
  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Report");

    // Header row
    sheet.addRow([
      "Login",
      "Name",
      "Credit (USD)",
      "Equity (USD)",
      "PIL (USD)",
      "PIL (AED)",
      "Partner %",
      "Partner Share (AED)",
      "Net After Partner (AED)",
    ]);

    // Data rows
    enhanced.forEach((r) => {
      sheet.addRow([
        r.Login,
        r.Name,
        r.Credit,
        r.Equity,
        r.pil.toFixed(2),
        r.pilAed.toFixed(2),
        r.partnerPercent,
        r.partnerShare.toFixed(2),
        r.netAfterPartner.toFixed(2),
      ]);
    });

    // Totals row
    sheet.addRow([
      "Totals",
      "",
      "",
      "",
      totals.pil.toFixed(2),
      totals.pilAed.toFixed(2),
      "",
      totals.partnerShare.toFixed(2),
      totals.netAfterPartner.toFixed(2),
    ]);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, "Accounts_Report.xlsx");
  };

  return (
    <div className="mt-8 bg-white shadow p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Accounts Report</h2>

      <div className="flex gap-6 mb-4 items-end">
        <label className="flex flex-col">
          <span className="text-sm font-semibold text-gray-700 mb-1">AED per USD</span>
          <input
            type="number"
            step="0.01"
            value={usdToAed}
            onChange={(e) => setUsdToAed(parseFloat(e.target.value) || 0)}
            className="border rounded px-2 py-1 w-24"
          />
        </label>

        <div className="w-64">
          <span className="text-sm font-semibold text-gray-700 mb-1 block">Filter by Name</span>
          <Select
            isMulti
            options={data.map((d) => ({ value: d.Name, label: d.Name }))}
            onChange={(selected) =>
              setSelectedNames(selected.map((s) => s.value))
            }
          />
        </div>

        <button
          onClick={handleExport}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Export to Excel
        </button>
      </div>

      <div className="overflow-auto max-h-[600px]">
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Login</th>
              <th className="border p-2">Name</th>
              <th className="border p-2 text-right">Credit (USD)</th>
              <th className="border p-2 text-right">Equity (USD)</th>
              <th className="border p-2 text-right">PIL (USD)</th>
              <th className="border p-2 text-right">PIL (AED)</th>
              <th className="border p-2 text-right">Partner %</th>
              <th className="border p-2 text-right">Partner Share (AED)</th>
              <th className="border p-2 text-right">Net After Partner (AED)</th>
            </tr>
          </thead>
          <tbody>
            {enhanced.map((r, i) => (
              <tr key={i}>
                <td className="border p-2">{r.Login}</td>
                <td className="border p-2">{r.Name}</td>
                <td className="border p-2 text-right">{r.Credit}</td>
                <td className="border p-2 text-right">{r.Equity}</td>
                <td
                  className={`border p-2 text-right ${
                    r.pil < 0 ? "text-red-600" : "text-green-700"
                  }`}
                >
                  {r.pil.toFixed(2)}
                </td>
                <td className="border p-2 text-right">{r.pilAed.toFixed(2)}</td>
                <td className="border p-2 text-right">
                 
                            <input
                                type="number"
                                value={r.partnerPercent}
                                onChange={(e) =>
                                    handlePartnerChange(r.Login, parseFloat(e.target.value) || 0)
                                }
                                className="border rounded px-1 py-0.5 w-16 text-right"
                            />
                
                </td>
                <td className="border p-2 text-right">{r.partnerShare.toFixed(2)}</td>
                <td className="border p-2 text-right font-semibold">{r.netAfterPartner.toFixed(2)}</td>
              </tr>
            ))}
            <tr className="bg-gray-200 font-bold">
              <td className="border p-2" colSpan={4}>
                Totals
              </td>
              <td className="border p-2 text-right">{totals.pil.toFixed(2)}</td>
              <td className="border p-2 text-right">{totals.pilAed.toFixed(2)}</td>
              <td className="border p-2"></td>
              <td className="border p-2 text-right">{totals.partnerShare.toFixed(2)}</td>
              <td className="border p-2 text-right">{totals.netAfterPartner.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
