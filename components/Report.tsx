"use client";
import React, { useEffect, useMemo, useState } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { ChevronDownIcon } from "@heroicons/react/24/solid";

interface GroupItem {
    ID?: string | number;
    GROUP?: string;
    Share?: number;
}

interface DataItem {
    Login: string | number;
    Name: string;
    Credit?: string | number;
    Equity?: string | number;
    Group?: string; // optional field used earlier
}

interface ReportProps {
    data: DataItem[];
    groups: GroupItem[];
}

interface CommissionRow {
    name: string;
    lots: number;
    rebate: number;
    commission: number;
}

interface BookEntry {
    group: string;
    amount: number;
    type: "Profit" | "Loss";
}

export default function Report({ data = [], groups = [] }: ReportProps) {
    const [usdToAed, setUsdToAed] = useState<number>(3.67);
    const [oldBalance, setOldBalance] = useState<number>(0);
    const [isNameFilterOpen, setIsNameFilterOpen] = useState(false);
    const [isGroupFilterOpen, setIsGroupFilterOpen] = useState(false);
    const [bookEntries, setBookEntries] = useState<BookEntry[]>([]);
    const [confirmedGroups, setConfirmedGroups] = useState<string[]>([]);
    const [selectedNames, setSelectedNames] = useState<string[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [groupTables, setGroupTables] = useState<Record<string, CommissionRow[]>>({});
    const [isAccountSelectOpen, setIsAccountSelectOpen] = useState(false);
    const [nameSearch, setNameSearch] = useState("");
    const [groupSearch, setGroupSearch] = useState("");
    const [accountsByGroup, setAccountsByGroup] = useState<Record<string, string[]>>({});
    const allNames = useMemo(() => Array.from(new Set(data.map((d) => d.Name || "")).values()).filter(Boolean), [data]);
    const allGroups = useMemo(() => Array.from(new Set(groups.map((g) => g.GROUP || "")).values()).filter(Boolean), [groups]);

    const toggleAllNames = (selectAll: boolean) => setSelectedNames(selectAll ? allNames.slice() : []);
    const toggleName = (name: string) =>
        setSelectedNames((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
    const filteredRows = useMemo(() => {
        return data
            .filter((r) => (selectedNames.length ? selectedNames.includes(r.Name) : true))
            .filter((r) => {
                const groupNames = groups.filter((g) => String(g.ID) === String(r.Login)).map((g) => g.GROUP || "");
                if (selectedGroup) return groupNames.includes(selectedGroup);
                return true;
            });
    }, [data, groups, selectedNames, selectedGroup]);

    const handleConfirmBookTotal = () => {
        if (!selectedGroup) return;
        setBookEntries((prev) => prev.filter((entry) => entry.group !== selectedGroup));

        const entry: BookEntry = {
            group: selectedGroup,
            amount: Math.abs(bookTotalValue),
            type: bookTotalValue >= 0 ? "Profit" : "Loss",
        };
        setBookEntries((prev) => [...prev, entry]);
        setConfirmedGroups((prev) => [...prev, selectedGroup]);
    };
    const enhanced = useMemo(() => {
        return filteredRows.map((r) => {
            const credit = typeof r.Credit === "string" ? parseFloat(r.Credit || "0") : Number(r.Credit || 0);
            const equity = typeof r.Equity === "string" ? parseFloat(r.Equity || "0") : Number(r.Equity || 0);
            const pnl = credit - equity;
            const pnlAed = pnl * usdToAed;
            const groupData = groups.find((g) => String(g.ID) === String(r.Login));
            const partnerPercent = Number(groupData?.Share || 0);
            const partnerShare = Math.round(pnlAed * (partnerPercent / 100));
            const netAfterPartner = Math.round(pnlAed - partnerShare);
            const groupName = groupData?.GROUP || "";
            return { ...r, pnl, pnlAed, partnerPercent, partnerShare, netAfterPartner, groupName };
        });
    }, [filteredRows, groups, usdToAed]);

    const totals = useMemo(() => {
        return enhanced.reduce(
            (acc, r) => {
                acc.pnl += r.pnl || 0;
                acc.pnlAed += r.pnlAed || 0;
                acc.partnerShare += r.partnerShare || 0;
                acc.netAfterPartner += r.netAfterPartner || 0;
                return acc;
            },
            { pnl: 0, pnlAed: 0, partnerShare: 0, netAfterPartner: 0 }
        );
    }, [enhanced]);

    const getAccountsByGroup = () => {
        const grouped: Record<string, string[]> = {};
        data.forEach((account) => {
            const relatedGroups = groups.filter((g) => String(g.ID) === String(account.Login));
            relatedGroups.forEach((g) => {
                const groupName = g.GROUP || "";
                if (!groupName) return;
                if (!grouped[groupName]) grouped[groupName] = [];
                if (!grouped[groupName].includes(account.Name)) grouped[groupName].push(account.Name);
            });
        });
        return grouped;
    };

    const handleAddAccountRow = (groupName: string, accountName: string) => {
        if (!groupName || !accountName) return;
        setGroupTables((prev) => {
            const existingRows = prev[groupName] || [];
            if (existingRows.some((r) => r.name === accountName)) return prev; // no dup
            const newRow: CommissionRow = { name: accountName, lots: 0, rebate: 0, commission: 0 };
            return { ...prev, [groupName]: [...existingRows, newRow] };
        });
    };

    const handleDeleteAccountRow = (groupName: string, index: number) => {
        setGroupTables((prev) => {
            const existingRows = prev[groupName] || [];
            const updatedRows = existingRows.filter((_, i) => i !== index);
            return { ...prev, [groupName]: updatedRows };
        });
    };

    const updateRow = (groupName: string, index: number, field: keyof CommissionRow, value: string | number) => {
        setGroupTables((prev) => {
            const rows = [...(prev[groupName] || [])];
            const row = { ...rows[index] } as CommissionRow | undefined;
            if (!row) return prev;

            if (field === "lots") row.lots = Number(value) || 0;
            else if (field === "rebate") row.rebate = Number(value) || 0;
            else if (field === "commission") row.commission = row.lots * row.rebate;

            row.commission = row.lots * row.rebate;

            rows[index] = row;
            return { ...prev, [groupName]: rows };
        });
    };
    const totalCommission = (groupName: string) => (groupTables[groupName] || []).reduce((sum, row) => sum + (row.lots || 0) * (row.rebate || 0), 0);
    const bookTotalValue = totals.netAfterPartner + (selectedGroup ? totalCommission(selectedGroup) : 0);
    const profitColumn = bookEntries.filter((e) => e.type === "Profit");
    const lossColumn = bookEntries.filter((e) => e.type === "Loss");

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
                Math.round(Number(r.Credit || 0)),
                Math.round(Number(r.Equity || 0)),
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

    const showConfirmButton = selectedGroup
        && !bookEntries.some(
            (entry) => entry.group === selectedGroup && entry.amount === Math.abs(bookTotalValue)
        );
    useEffect(() => setSelectedNames(allNames.slice()), [allNames.join("||")]);
    useEffect(() => setAccountsByGroup(getAccountsByGroup()), [data, groups]);
    useEffect(() => {
        if (!selectedGroup) return;
        setConfirmedGroups((prev) => prev.filter((g) => g !== selectedGroup));
    }, [bookTotalValue, selectedGroup]);
    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="bg-white rounded-2xl shadow p-6">
                <div className="flex flex-col lg:flex-row gap-4 lg:items-end justify-between">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                        <div>
                            <label className="block text-sm font-medium text-gray-600">AED per USD</label>
                            <input
                                type="number"
                                step="0.01"
                                value={usdToAed}
                                onChange={(e) => setUsdToAed(parseFloat(e.target.value) || 0)}
                                className="mt-1 w-32 border border-gray-200 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                        </div>

                        <div className="flex gap-3">
                            {[{
                                label: 'Name',
                                isOpen: isNameFilterOpen,
                                setOpen: setIsNameFilterOpen,
                                all: allNames,
                                selected: selectedNames,
                                toggleAll: toggleAllNames,
                                toggle: toggleName,
                                search: nameSearch,
                                setSearch: setNameSearch
                            }, {
                                label: 'Group',
                                isOpen: isGroupFilterOpen,
                                setOpen: setIsGroupFilterOpen,
                                all: allGroups,
                                selected: selectedGroup,
                                search: groupSearch,
                                setSearch: setGroupSearch
                            }].map(({ label, isOpen, setOpen, all, selected, toggleAll, toggle, search, setSearch }: any) => (
                                <div key={label} className="relative">
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Filter by {label}</label>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsGroupFilterOpen(false);
                                            setIsNameFilterOpen(false);
                                            setOpen(!isOpen);
                                        }}
                                        className={`flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md bg-white shadow-sm text-sm ${isOpen ? 'ring-2 ring-blue-400' : ''}`}
                                    >
                                        {label === 'Group'
                                            ? (selected ? selected : 'All')         // show selected group or All
                                            : (selected.length ? `${selected.length} selected` : 'All')}
                                        <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isOpen && (
                                        <div className="absolute z-50 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                                            <input
                                                type="text"
                                                placeholder={`Search ${label.toLowerCase()}...`}
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                className="w-full mb-2 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                                            />

                                            {label === 'Name' && (
                                                <div className="flex justify-between text-xs text-blue-600 mb-2">
                                                    <button onClick={() => toggleAll(true)}>Select All</button>
                                                    <button onClick={() => toggleAll(false)}>Clear</button>
                                                </div>
                                            )}

                                            <div className="max-h-48 overflow-auto space-y-1">
                                                {all.filter((it: string) => it.toLowerCase().includes((search || "").toLowerCase())).map((item: string) => (
                                                    label === 'Group' ? (
                                                        <div
                                                            key={item}
                                                            onClick={() => { setSelectedGroup(item); setIsGroupFilterOpen(false); setGroupSearch(""); setOldBalance(0); }}
                                                            className={`px-2 py-1 cursor-pointer text-sm ${selected === item ? 'bg-blue-100' : ''}`}
                                                        >
                                                            {item}
                                                        </div>
                                                    ) : (
                                                        <label key={item} className="flex items-center gap-2 text-sm">
                                                            <input type="checkbox" checked={selected.includes(item)} onChange={() => toggle(item)} className="accent-blue-600" />
                                                            <span>{item}</span>
                                                        </label>
                                                    )
                                                ))}

                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                    </div>

                    <div className="flex gap-3">
                        <button onClick={handleExport} className="bg-blue-600 text-white px-4 py-2 rounded-md shadow hover:bg-blue-700">Export to Excel</button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-4 overflow-auto">
                <h3 className="text-lg font-semibold mb-4">Accounts Report</h3>
                <div className="overflow-x-auto rounded-lg">
                    <table className="min-w-full text-sm border border-gray-300">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr className="border-b border-gray-300">
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
                                ].map((c) => (
                                    <th
                                        key={c}
                                        className="px-3 py-2 text-left text-xs font-medium text-gray-600 border border-gray-300"
                                    >
                                        {c}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {enhanced.map((r: any) => (
                                <tr
                                    key={String(r.Login) + r.Name}
                                    className="hover:bg-gray-50 border-b border-gray-200"
                                >
                                    <td className="px-3 py-2 border border-gray-300">{r.Login}</td>
                                    <td className="px-3 py-2 border border-gray-300">{r.Name}</td>
                                    <td className="px-3 py-2 text-right border border-gray-300">
                                        {Math.round(Number(r.Credit || 0))}
                                    </td>
                                    <td className="px-3 py-2 text-right border border-gray-300">
                                        {Math.round(Number(r.Equity || 0))}
                                    </td>
                                    <td
                                        className={`px-3 py-2 text-right border border-gray-300 ${r.pnl < 0 ? "text-red-600" : "text-green-700"
                                            }`}
                                    >
                                        {Math.round(r.pnl)}
                                    </td>
                                    <td className="px-3 py-2 text-right border border-gray-300">
                                        {Math.round(r.pnlAed)}
                                    </td>
                                    <td className="px-3 py-2 text-right border border-gray-300">
                                        {r.partnerPercent}
                                    </td>
                                    <td className="px-3 py-2 text-right border border-gray-300">
                                        {Math.round(r.partnerShare)}
                                    </td>
                                    <td className="px-3 py-2 text-right font-semibold border border-gray-300">
                                        {Math.round(r.netAfterPartner)}
                                    </td>
                                </tr>
                            ))}

                            {/* Totals row */}
                            <tr className="bg-gray-100 font-semibold border-t border-gray-300">
                                <td className="px-3 py-2 border border-gray-300" colSpan={4}>
                                    Totals
                                </td>
                                <td className="px-3 py-2 text-right border border-gray-300">
                                    {Math.round(totals.pnl)}
                                </td>
                                <td className="px-3 py-2 text-right border border-gray-300">
                                    {Math.round(totals.pnlAed)}
                                </td>
                                <td className="px-3 py-2 border border-gray-300"></td>
                                <td className="px-3 py-2 text-right border border-gray-300">
                                    {Math.round(totals.partnerShare)}
                                </td>
                                <td className="px-3 py-2 text-right border border-gray-300">
                                    {Math.round(totals.netAfterPartner)}
                                </td>
                            </tr>

                            {/* Total Commission */}
                            <tr className="border-t border-gray-300">
                                <td className="px-3 py-2 text-right font-medium border border-gray-300" colSpan={8}>
                                    Total Commission
                                </td>
                                <td className="px-3 py-2 text-right font-semibold border border-gray-300">
                                    {selectedGroup ? totalCommission(selectedGroup) : 0}
                                </td>
                            </tr>

                            {/* Book Total */}
                            <tr className="border-t border-gray-300">
                                <td className="px-3 py-2 text-right font-medium border border-gray-300" colSpan={8}>
                                    Book Total
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-blue-700 border border-gray-300">
                                    {Math.round(
                                        totals.netAfterPartner +
                                        (selectedGroup ? totalCommission(selectedGroup) : 0)
                                    )}
                                    {showConfirmButton && (
                                        <button
                                            onClick={handleConfirmBookTotal}
                                            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md"
                                        >
                                            Confirm
                                        </button>
                                    )}
                                    {selectedGroup && confirmedGroups.includes(selectedGroup) && (
                                        <span className="text-green-600 font-medium text-sm mt-2">
                                            ✅ Confirmed
                                        </span>
                                    )}
                                </td>
                            </tr>

                            {/* Old Balance */}
                            <tr className="border-t border-gray-300">
                                <td className="px-3 py-2 text-right font-medium border border-gray-300" colSpan={8}>
                                    Old Balance
                                </td>
                                <td className="px-3 py-2 text-right border border-gray-300">
                                    <input
                                        type="number"
                                        value={oldBalance}
                                        onChange={(e) => setOldBalance(parseInt(e.target.value) || 0)}
                                        className="w-28 border rounded px-2 py-1 text-right focus:ring-2 focus:ring-blue-300"
                                    />
                                </td>
                            </tr>

                            {/* Grand Total */}
                            <tr className="bg-blue-50 font-bold text-blue-800 border-t border-gray-300">
                                <td className="px-3 py-2 text-right border border-gray-300" colSpan={8}>
                                    Grand Total
                                </td>
                                <td className="px-3 py-2 text-right border border-gray-300">
                                    {Math.round(
                                        totals.netAfterPartner +
                                        oldBalance +
                                        (selectedGroup ? totalCommission(selectedGroup) : 0)
                                    )}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Commission Report</h3>


                </div>
                {selectedGroup ? (
                    <div className="border rounded-md">
                        <div className="flex justify-end p-3 border-b">
                            <div className="relative">
                                <button
                                    onClick={() => setIsAccountSelectOpen((p) => !p)}
                                    className="px-3 py-2 bg-green-500 text-white rounded-md"
                                >
                                    + Add Row
                                </button>
                                {isAccountSelectOpen && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-40">
                                        <input
                                            type="text"
                                            placeholder="Search account..."
                                            className="w-full mb-2 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                                            value={nameSearch}
                                            onChange={(e) => setNameSearch(e.target.value)}
                                        />
                                        <ul className="max-h-48 overflow-auto divide-y divide-gray-50">
                                            {(accountsByGroup[selectedGroup] || [])
                                                .filter((acc) => !(groupTables[selectedGroup] || []).some((r) => r.name === acc))
                                                .filter((acc) => acc.toLowerCase().includes(nameSearch.toLowerCase()))
                                                .map((acc) => (
                                                    <li
                                                        key={acc}
                                                        onClick={() => {
                                                            handleAddAccountRow(selectedGroup, acc);
                                                            setIsAccountSelectOpen(false);
                                                            setNameSearch('');
                                                        }}
                                                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                                                    >
                                                        {acc}
                                                    </li>
                                                ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="overflow-auto max-h-96">
                            <table className="min-w-full text-sm border border-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium border border-gray-300">Name</th>
                                        <th className="px-4 py-2 text-right font-medium border border-gray-300">Lots</th>
                                        <th className="px-4 py-2 text-right font-medium border border-gray-300">Rebate</th>
                                        <th className="px-4 py-2 text-right font-medium border border-gray-300">Commission</th>
                                        <th className="px-4 py-2 text-center font-medium border border-gray-300"> </th>
                                    </tr>
                                </thead>

                                <tbody className="bg-white">
                                    {(groupTables[selectedGroup] || []).map((r, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 border border-gray-300">{r.name}</td>
                                            <td className="px-4 py-2 text-right border border-gray-300">
                                                <input
                                                    type="number"
                                                    className="w-20 border rounded px-2 py-1 text-right"
                                                    value={r.lots}
                                                    onChange={(e) => updateRow(selectedGroup, i, 'lots', e.target.value)}
                                                    disabled={confirmedGroups.includes(selectedGroup)}
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-right border border-gray-300">
                                                <input
                                                    type="number"
                                                    className="w-20 border rounded px-2 py-1 text-right"
                                                    value={r.rebate}
                                                    onChange={(e) => updateRow(selectedGroup, i, 'rebate', e.target.value)}
                                                    disabled={confirmedGroups.includes(selectedGroup)}
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-right border border-gray-300">
                                                {r.commission || 0}
                                            </td>
                                            <td className="px-4 py-2 text-center border border-gray-300">
                                                <button
                                                    onClick={() => handleDeleteAccountRow(selectedGroup, i)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    ✕
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Total row */}
                                    <tr className="bg-gray-50 font-semibold border-t border-gray-300">
                                        <td className="px-4 py-2 text-right border border-gray-300" colSpan={3}>
                                            Total
                                        </td>
                                        <td className="px-4 py-2 text-right border border-gray-300">
                                            {totalCommission(selectedGroup)}
                                        </td>
                                        <td className="px-4 py-2 border border-gray-300" />
                                    </tr>
                                </tbody>
                            </table>

                        </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-500 py-8">
                        Please select a group to view or add commission data.
                    </div>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">The Book</h3>
                </div>
                <div className="overflow-auto">
                    <table className="w-full text-sm border border-gray-300">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left font-bold border border-gray-300">Profit</th>
                                <th className="px-6 py-3 text-right font-bold border border-gray-300">Loss</th>
                            </tr>
                        </thead>

                        <tbody className="bg-white">
                            <tr>
                                <td className="px-6 py-4 align-top border border-gray-300">
                                    {profitColumn.map((p, i) => (
                                        <div key={p.group} className="mb-2 font-medium text-gray-800">
                                            {p.group}: {p.amount.toFixed(2)}
                                        </div>
                                    ))}
                                </td>
                                <td className="px-6 py-4 align-top text-right border border-gray-300">
                                    {lossColumn.map((l, i) => (
                                        <div key={l.group} className="mb-2 font-medium text-gray-800">
                                            {l.group}: {l.amount.toFixed(2)}
                                        </div>
                                    ))}
                                </td>
                            </tr>

                            <tr className="bg-gray-50 font-semibold">
                                <td className="px-6 py-4 border border-gray-300">
                                    Total Profit:{" "}
                                    {profitColumn
                                        .reduce((sum, p) => sum + p.amount, 0)
                                        .toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-right border border-gray-300">
                                    Total Loss:{" "}
                                    {lossColumn
                                        .reduce((sum, l) => sum + l.amount, 0)
                                        .toFixed(2)}
                                </td>
                            </tr>

                            <tr className="bg-green-100 font-bold text-lg text-center">
                                <td
                                    className="px-6 py-4 border border-gray-300 text-green-900"
                                    colSpan={2}
                                >
                                    The Book:{" "}
                                    {(
                                        profitColumn.reduce((sum, p) => sum + p.amount, 0) -
                                        lossColumn.reduce((sum, l) => sum + l.amount, 0)
                                    ).toFixed(2)}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                </div>
            </div>
        </div>
    );
}
