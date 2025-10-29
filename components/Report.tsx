"use client";
import { useState } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { ChevronDownIcon } from "@heroicons/react/24/solid";

export default function Report({ data }: { data: any[] }) {
    const [usdToAed, setUsdToAed] = useState(3.67);
    const [rows, setRows] = useState(
        data.map((row) => ({ ...row, partnerPercent: 0 }))
    );
    const [selectedNames, setSelectedNames] = useState<string[]>([]);
    const [oldBalance, setOldBalance] = useState(0);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const handlePartnerChange = (login: string, value: number) => {
        const newRows = rows.map((r) =>
            r.Login === login ? { ...r, partnerPercent: value } : r
        );
        setRows(newRows);
    };

    const allNames = Array.from(new Set(data.map((d) => d.Name)));

    const toggleAll = (selectAll: boolean) => {
        if (selectAll) setSelectedNames(allNames);
        else setSelectedNames([]);
    };

    const toggleName = (name: string) => {
        if (selectedNames.includes(name))
            setSelectedNames(selectedNames.filter((n) => n !== name));
        else setSelectedNames([...selectedNames, name]);
    };

    const filteredRows = selectedNames.length
        ? rows.filter((r) => selectedNames.includes(r.Name))
        : rows;

    const enhanced = filteredRows
        .map((r) => {
            const credit = parseFloat(r.Credit || 0);
            const equity = parseFloat(r.Equity || 0);
            const pnl = credit - equity;
            const pnlAed = pnl * usdToAed;
            const partnerShare = Math.round(pnlAed * (r.partnerPercent / 100));
            const netAfterPartner = pnlAed - partnerShare;
            return { ...r, pnl, pnlAed, partnerShare, netAfterPartner };
        })
        .filter((r) => r.pnl !== 0);

    const totals = enhanced.reduce(
        (acc, r) => {
            acc.pnl += r.pnl;
            acc.pnlAed += r.pnlAed;
            acc.partnerShare += r.partnerShare;
            acc.netAfterPartner += r.netAfterPartner;
            return acc;
        },
        { pnl: 0, pnlAed: 0, partnerShare: 0, netAfterPartner: 0 }
    );

    const handleExport = async () => {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Report");

        sheet.addRow([
            "Login",
            "Name",
            "Credit (USD)",
            "Equity (USD)",
            "PNL (USD)",
            "PNL (AED)",
            "Partner %",
            "Partner Share (AED)",
            "Net Total (AED)",
        ]);

        enhanced.forEach((r) => {
            sheet.addRow([
                r.Login,
                r.Name,
                Math.round(r.Credit),
                Math.round(r.Equity),
                Math.round(r.pnl),
                Math.round(r.pnlAed),
                r.partnerPercent,
                r.partnerShare,
                r.netAfterPartner,
            ]);
        });

        sheet.addRow([
            "Totals",
            "",
            "",
            "",
            Math.round(totals.pnl),
            Math.round(totals.pnlAed),
            "",
            totals.partnerShare,
            totals.netAfterPartner,
        ]);

        if (oldBalance > 0) {
            sheet.addRow(["Old Balance", "", "", "", "", "", "", "", oldBalance]);
            sheet.addRow([
                "Grand Total",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                totals.netAfterPartner - oldBalance,
            ]);
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/octet-stream" });
        saveAs(blob, "Accounts_Report.xlsx");
    };

    return (
        <div className="mt-8 bg-white shadow p-6 rounded-lg relative">
            <h2 className="text-2xl font-bold mb-4">Accounts Report</h2>

            <div className="flex gap-6 mb-4 items-end">
                <label className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-700 mb-1">
                        AED per USD
                    </span>
                    <input
                        type="number"
                        step="0.01"
                        value={usdToAed}
                        onChange={(e) => setUsdToAed(parseFloat(e.target.value) || 0)}
                        className="border rounded px-2 py-1 w-24"
                    />
                </label>

                {/* Excel-like Filter */}
                <div className="relative">
                    <span className="text-sm font-semibold text-gray-700 mb-1 block">
                        Filter by Name
                    </span>
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="border px-3 py-1 rounded flex items-center gap-1 bg-white hover:bg-gray-50"
                    >
                        {selectedNames.length
                            ? `${selectedNames.length} selected`
                            : "All"}
                        <ChevronDownIcon className="w-4 h-4" />
                    </button>

                    {isFilterOpen && (
                        <div className="absolute mt-1 z-50 bg-white border rounded shadow-lg w-56 max-h-64 overflow-auto">
                            <div className="flex justify-between px-2 py-1 border-b bg-gray-50 text-xs text-gray-600">
                                <button
                                    onClick={() => toggleAll(true)}
                                    className="hover:underline"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={() => toggleAll(false)}
                                    className="hover:underline"
                                >
                                    Clear All
                                </button>
                            </div>
                            <ul className="p-2 space-y-1">
                                {allNames.map((name) => (
                                    <li key={name} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedNames.includes(name)}
                                            onChange={() => toggleName(name)}
                                        />
                                        <span className="text-sm">{name}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
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
                            <th className="border p-2 text-right">PNL (USD)</th>
                            <th className="border p-2 text-right">PNL (AED)</th>
                            <th className="border p-2 text-right">Partner %</th>
                            <th className="border p-2 text-right">Partner Share (AED)</th>
                            <th className="border p-2 text-right">Net Total (AED)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {enhanced.map((r) => (
                            <tr key={r.Login}>
                                <td className="border p-2">{r.Login}</td>
                                <td className="border p-2">{r.Name}</td>
                                <td className="border p-2 text-right">{Math.round(r.Credit)}</td>
                                <td className="border p-2 text-right">{Math.round(r.Equity)}</td>
                                <td
                                    className={`border p-2 text-right ${r.pnl < 0 ? "text-red-600" : "text-green-700"}`}
                                >
                                    {Math.round(r.pnl)}
                                </td>
                                <td className="border p-2 text-right">{Math.round(r.pnlAed)}</td>
                                <td className="border p-2 text-right">
                                    <input
                                        type="number"
                                        value={r.partnerPercent}
                                        onChange={(e) =>
                                            handlePartnerChange(r.Login, parseInt(e.target.value) || 0)
                                        }
                                        className="border rounded px-1 py-0.5 w-16 text-right"
                                    />
                                </td>
                                <td className="border p-2 text-right">{Math.round(r.partnerShare)}</td>
                                <td className="border p-2 text-right font-semibold">
                                    {Math.round(r.netAfterPartner - oldBalance)}
                                </td>
                            </tr>
                        ))}
                        <tr className="bg-gray-200 font-bold">
                            <td className="border p-2" colSpan={4}>Totals</td>
                            <td className="border p-2 text-right">{Math.round(totals.pnl)}</td>
                            <td className="border p-2 text-right">{Math.round(totals.pnlAed)}</td>
                            <td className="border p-2"></td>
                            <td className="border p-2 text-right">{Math.round(totals.partnerShare)}</td>
                            <td className="border p-2 text-right">{Math.round(totals.netAfterPartner)}</td>
                        </tr>
                        <tr>
                            <td className="border p-2 font-semibold" colSpan={8}>Old Balance</td>
                            <td className="border p-2">
                                <input
                                    type="number"
                                    value={oldBalance}
                                    onChange={(e) => setOldBalance(parseInt(e.target.value) || 0)}
                                    className="border rounded px-1 py-0.5 w-24 text-right"
                                />
                            </td>
                        </tr>
                        <tr className="bg-gray-100 font-bold">
                            <td className="border p-2" colSpan={8}>Grand Total</td>
                            <td className="border p-2 text-right">
                                {Math.round(totals.netAfterPartner - oldBalance)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
