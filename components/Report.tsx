"use client";
import { useState, useMemo, useEffect } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { ChevronDownIcon, PlusIcon } from "@heroicons/react/24/solid";

interface ReportProps {
    data: any[];
    groups: any[];
}

interface CommissionRow {
    name: string;
    lots: number;
    rebate: number; // changed to number
}



export default function Report({ data, groups }: ReportProps) {
    const [usdToAed, setUsdToAed] = useState(3.67);
    const [oldBalance, setOldBalance] = useState(0);
    const [isNameFilterOpen, setIsNameFilterOpen] = useState(false);
    const [isGroupFilterOpen, setIsGroupFilterOpen] = useState(false);

    // Unique Names
    const allNames = useMemo(() => Array.from(new Set(data.map((d) => d.Name))), [data]);

    // Unique Groups from groups.xlsx
    const allGroups = useMemo(
        () => Array.from(new Set(groups.map((g) => g.GROUP).filter(Boolean))),
        [groups]
    );

    const [selectedNames, setSelectedNames] = useState<string[]>(allNames);
    const [selectedGroups, setSelectedGroups] = useState<string[]>(allGroups);

    const [commissionRows, setCommissionRows] = useState<Array<Partial<CommissionRow>>>([]);


    // Toggle functions
    const toggleAllNames = (selectAll: boolean) => setSelectedNames(selectAll ? allNames : []);
    const toggleName = (name: string) =>
        setSelectedNames((prev) =>
            prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
        );

    const toggleAllGroups = (selectAll: boolean) => setSelectedGroups(selectAll ? allGroups : []);
    const toggleGroup = (group: string) =>
        setSelectedGroups((prev) =>
            prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
        );

    // Apply filters
    const filteredRows = data
        .filter((r) => (selectedNames.length ? selectedNames.includes(r.Name) : true))
        .filter((r) => {
            const groupName = groups.find((g) => String(g.ID) === String(r.Login))?.GROUP || "";
            return selectedGroups.length ? selectedGroups.includes(groupName) : true;
        });

    // Enhanced rows with calculations
    const enhanced = filteredRows.map((r) => {
        const credit = parseFloat(r.Credit || 0);
        const equity = parseFloat(r.Equity || 0);
        const pnl = credit - equity;
        const pnlAed = pnl * usdToAed;

        const groupData = groups.find((g) => String(g.ID) === String(r.Login));
        const partnerPercent = groupData?.Share || 0;
        const partnerShare = Math.round(pnlAed * (partnerPercent / 100));
        const netAfterPartner = pnlAed - partnerShare;
        const groupName = groupData?.GROUP || "";

        return { ...r, pnl, pnlAed, partnerPercent, partnerShare, netAfterPartner, groupName };
    });

    // Totals
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
    const filteredNames = useMemo(() => filteredRows.map(r => r.Name), [filteredRows]);

    // Export to Excel
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
            "Group",
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
                r.groupName,
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
            "",
        ]);

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/octet-stream" });
        saveAs(blob, "Accounts_Report.xlsx");
    };

    const addCommissionRow = () => {
        setCommissionRows([
            ...commissionRows,
            { name: filteredNames[0] || "", lots: 0, rebate: 0 } // rebate as number
        ]);
    };

    
    const updateCommissionRow = (
        index: number,
        field: keyof CommissionRow,
        value: string | number
    ) => {
        const newRows = [...commissionRows];

        if (field === "lots" || field === "rebate") {
            newRows[index][field] = Number(value); // make sure numeric
        } else {
            newRows[index][field] = String(value);
        }

        setCommissionRows(newRows);
    };

   

    // Add a computed commission for each row
    const commissionWithValue = commissionRows.map(row => ({
        ...row,
        commission: (row.lots || 0)* (row.rebate || 0)  // fallback to 0
    }));


    // Total Commission
    const totalCommission = useMemo(() => {
        return commissionRows.reduce(
            (sum, row) => sum + (row.lots || 0) * (row.rebate || 0),
            0
        );
    }, [commissionRows]);





    useEffect(() => {
        setCommissionRows((prevRows) => {
            const updated = prevRows.map((row) => ({
                ...row,
                name: filteredNames.includes(row.name) ? row.name : filteredNames[0] || "",
            }));

            // Only update if something changed
            const isEqual = prevRows.every((r, i) => r.name === updated[i].name);
            if (isEqual) return prevRows; // no state update
            return updated;
        });
    }, [filteredNames]);


    return (
        // 🟦 Outer wrapper closes dropdowns when clicked
        <div
            className="mt-10 bg-white shadow-lg rounded-xl p-8 relative"
            onClick={() => {
                setIsNameFilterOpen(false);
                setIsGroupFilterOpen(false);
            }}
        >
            <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">
                Accounts Report
            </h2>

            {/* 🟩 Filter controls (clicks inside won’t close dropdowns) */}
            <div
                className="flex flex-wrap gap-6 mb-6 items-end"
                onClick={(e) => e.stopPropagation()}
            >
                {/* AED per USD */}
                <label className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700 mb-1">AED per USD</span>
                    <input
                        type="number"
                        step="0.01"
                        value={usdToAed}
                        onChange={(e) => setUsdToAed(parseFloat(e.target.value) || 0)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 w-28 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    />
                </label>

                {/* Dropdown Filters */}
                {[
                    {
                        label: "Name",
                        isOpen: isNameFilterOpen,
                        setOpen: setIsNameFilterOpen,
                        all: allNames,
                        selected: selectedNames,
                        toggleAll: toggleAllNames,
                        toggle: toggleName,
                    },
                    {
                        label: "Group",
                        isOpen: isGroupFilterOpen,
                        setOpen: setIsGroupFilterOpen,
                        all: allGroups,
                        selected: selectedGroups,
                        toggleAll: toggleAllGroups,
                        toggle: toggleGroup,
                    },
                ].map(({ label, isOpen, setOpen, all, selected, toggleAll, toggle }) => (
                    <div className="relative" key={label}>
                        <span className="text-sm font-medium text-gray-700 mb-1 block">
                            Filter by {label}
                        </span>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                // Close other dropdown when one opens
                                if (label === "Name") {
                                    setIsGroupFilterOpen(false);
                                } else {
                                    setIsNameFilterOpen(false);
                                }
                                setOpen(!isOpen);
                            }}
                            className={`border border-gray-300 bg-white rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm transition-all duration-150 ${isOpen ? "ring-2 ring-blue-400 shadow-sm" : "hover:bg-gray-50"
                                }`}
                        >
                            {selected.length ? `${selected.length} selected` : "All"}
                            <ChevronDownIcon
                                className={`w-4 h-4 text-gray-500 transition-transform duration-150 ${isOpen ? "rotate-180" : ""
                                    }`}
                            />
                        </button>

                        {isOpen && (
                            <div
                                className="absolute mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-xl w-60 max-h-64 overflow-auto animate-fadeIn"
                                style={{ animation: "fadeIn 0.15s ease-in-out" }}
                            >
                                <div className="flex justify-between px-3 py-2 border-b bg-gray-50 text-xs text-gray-600 sticky top-0 shadow-sm">
                                    <button
                                        onClick={() => {
                                            toggleAll(true);
                                            setOpen(false);
                                        }}
                                        className="hover:underline"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        onClick={() => {
                                            toggleAll(false);
                                            setOpen(false);
                                        }}
                                        className="hover:underline"
                                    >
                                        Clear All
                                    </button>
                                </div>

                                <ul className="p-2 space-y-1 overflow-y-auto custom-scrollbar">
                                    {all.map((item: string) => (
                                        <li
                                            key={item}
                                            className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors duration-100"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selected.includes(item)}
                                                onChange={() => toggle(item)}
                                                className="accent-blue-600"
                                            />
                                            <span className="text-sm text-gray-700">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}

                {/* Export Button */}
                <button
                    onClick={handleExport}
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-all focus:ring-2 focus:ring-blue-400"
                >
                    Export to Excel
                </button>
            </div>

            {/* 🧾 Table */}
            <div className="overflow-auto rounded-lg border border-gray-300 max-h-[600px]">
                <table className="min-w-full text-sm border-collapse border border-gray-300">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr className="text-gray-700">
                            {[
                                "Login",
                                "Name",
                                "Credit (USD)",
                                "Equity (USD)",
                                "PNL (USD)",
                                "PNL (AED)",
                                "Partner %",
                                "Partner Share (AED)",
                                "Net Total (AED)",
                            ].map((col) => (
                                <th
                                    key={col}
                                    className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700"
                                >
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {enhanced.map((r) => (
                            <tr key={r.Login} className="hover:bg-gray-50 transition-colors">
                                <td className="border border-gray-300 px-3 py-2">{r.Login}</td>
                                <td className="border border-gray-300 px-3 py-2">{r.Name}</td>
                                <td className="border border-gray-300 px-3 py-2 text-right">
                                    {Math.round(r.Credit)}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-right">
                                    {Math.round(r.Equity)}
                                </td>
                                <td
                                    className={`border border-gray-300 px-3 py-2 text-right ${r.pnl < 0 ? "text-red-600" : "text-green-700"
                                        }`}
                                >
                                    {Math.round(r.pnl)}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-right">
                                    {Math.round(r.pnlAed)}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-right">
                                    {r.partnerPercent}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-right">
                                    {Math.round(r.partnerShare)}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-right font-semibold">
                                    {Math.round(r.netAfterPartner)}
                                </td>
                            </tr>
                        ))}

                        {/* Totals */}
                        <tr className="bg-gray-100 font-semibold">
                            <td className="border border-gray-300 px-3 py-2" colSpan={4}>
                                Totals
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-right">
                                {Math.round(totals.pnl)}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-right">
                                {Math.round(totals.pnlAed)}
                            </td>
                            <td className="border border-gray-300 px-3 py-2"></td>
                            <td className="border border-gray-300 px-3 py-2 text-right">
                                {Math.round(totals.partnerShare)}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-right">
                                {Math.round(totals.netAfterPartner)}
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-gray-300 px-3 py-2 font-medium text-right" colSpan={8}>
                                Total Commission
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-right">{totalCommission}</td>
                        </tr>



                        {/* Old Balance */}
                        <tr>
                            <td className="border border-gray-300 px-3 py-2 font-medium text-right" colSpan={8}>
                                Old Balance
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-right">
                                <input
                                    type="number"
                                    value={oldBalance}
                                    onChange={(e) => setOldBalance(parseInt(e.target.value) || 0)}
                                    className="border border-gray-300 rounded-md px-2 py-1 w-24 text-right focus:ring-2 focus:ring-blue-400"
                                />
                            </td>
                        </tr>

                        {/* Grand Total */}
                        <tr className="bg-blue-50 font-bold text-blue-800">
                            <td className="border border-gray-300 px-3 py-2 text-right" colSpan={8}>
                                Grand Total
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-right border-l-2 border-blue-400">
                                {Math.round(totals.netAfterPartner + oldBalance + totalCommission)}
                            </td>
                        </tr>

                    </tbody>
                </table>
            </div>

            {selectedGroups.length > 0 && (
                <div className="mt-10">
                    <h2 className="text-xl font-semibold mb-3 text-gray-800 border-b pb-2">Commission Table</h2>
                    <button
                        onClick={addCommissionRow}
                        className="mb-3 flex items-center gap-2 bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700"
                    >
                        <PlusIcon className="w-4 h-4" /> Add Row
                    </button>

                    <div className="overflow-auto rounded-lg border border-gray-300 max-h-[400px]">
                        <table className="min-w-full text-sm border-collapse border border-gray-300">
                            <thead className="bg-gray-100 sticky top-0 z-10">
                                <tr className="text-gray-700">
                                    {["Name", "No. of Lots", "Rebate", "Commission"].map((col) => (
                                        <th key={col} className="border border-gray-300 px-3 py-2 text-left font-semibold">{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {commissionWithValue.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="border border-gray-300 px-3 py-2">
                                            <select
                                                value={row.name}
                                                onChange={(e) => updateCommissionRow(idx, "name", e.target.value)}
                                                className="border border-gray-300 rounded-md px-2 py-1 w-full"
                                            >
                                                {filteredNames.map((name) => (
                                                    <option key={name} value={name}>{name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="border border-gray-300 px-3 py-2">
                                            <input
                                                type="number"
                                                value={row.lots}
                                                onChange={(e) => updateCommissionRow(idx, "lots", parseInt(e.target.value) || 0)}
                                                className="border border-gray-300 rounded-md px-2 py-1 w-full"
                                            />
                                        </td>
                                        <td className="border border-gray-300 px-3 py-2">
                                            <input
                                                type="number"
                                                value={row.rebate}
                                                onChange={(e) => updateCommissionRow(idx, "rebate", parseInt(e.target.value) || 0)}
                                                className="border border-gray-300 rounded-md px-2 py-1 w-full"
                                            />
                                        </td>
                                        <td className="border border-gray-300 px-3 py-2 text-right font-semibold">
                                            {row.commission}
                                        </td>
                                    </tr>
                                ))}

                                {/* Total row */}
                                <tr className="border border-gray-300 px-3 py-2 text-right font-semibold">
                                    <td className="border border-gray-300 px-3 py-2 text-right font-semibold" colSpan={3}>
                                        Total Commission
                                    </td>
                                    <td className="border border-gray-300 px-3 py-2 text-right font-semibold">
                                        {commissionWithValue.reduce((sum, row) => sum + Number(row.commission || 0), 0)}
                                    </td>
                                </tr>
                            </tbody>



                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
