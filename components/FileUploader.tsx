"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

export default function FileUploader({
    onUpload,
}: {
    onUpload: (data: {
        parsedAccounts: any[];
        htmlPreview: string;
        groupsData: any[];
    }) => void;
}) {
    const [message, setMessage] = useState("");
    const [accountFiles, setAccountFiles] = useState<File[]>([]);
    const [groupsFile, setGroupsFile] = useState<File | null>(null);
    const [status, setStatus] = useState("");

    // Parse single HTML accounts file
    const parseHtmlFile = async (file: File) => {
        const text = await file.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/html");
        const rows = Array.from(doc.querySelectorAll("table tr"));

        const parsed = rows
            .map((tr) =>
                Array.from(tr.querySelectorAll("td, th")).map((td) => td.textContent?.trim())
            )
            .filter((r) => r.length >= 6)
            .map((r) => ({
                Login: r[0],
                Name: r[1],
                LastName: r[2],
                MiddleName: r[3],
                Credit: r[4],
                Equity: r[5],
            }))
            .slice(1); // skip header

        return parsed;
    };

    // Parse groups.xlsx
    const parseGroupsFile = async (file: File) => {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        return XLSX.utils.sheet_to_json(firstSheet);
    };

    // Handle multiple account files selection
    const handleAccountsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        if (!files.length) return;

        const newFiles = [...accountFiles, ...files];
        setAccountFiles(newFiles);
        setMessage(`✅ Selected ${newFiles.length} account file(s).`);
    };

    // Handle groups.xlsx selection
    const handleGroupsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (!file) return;
        setGroupsFile(file);
        setMessage(`✅ Groups file loaded: ${file.name}`);
    };

    // Generate HTML table from merged accounts
    const generateHtmlPreview = (accounts: any[]) => {
        if (!accounts.length) return "";

        const headers = ["Login", "Name", "LastName", "MiddleName", "Credit", "Equity"];
        const headerRow = headers
            .map((h) => `<th style="border: 1px solid #000; padding: 5px;">${h}</th>`)
            .join("");
        const rows = accounts
            .map(
                (acc) =>
                    `<tr>${headers
                        .map((h) => `<td style="border: 1px solid #000; padding: 5px;">${acc[h] ?? ""}</td>`)
                        .join("")}</tr>`
            )
            .join("");

        return `
      <table style="border-collapse: collapse; width: 100%;">
        <thead style="background: #f3f4f6;">
          <tr>${headerRow}</tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    };

    // Process all files
    const handleProcess = async () => {
        if (!accountFiles.length) {
            setStatus("❌ Please upload at least one accounts.htm file.");
            return;
        }

        setStatus("⏳ Processing files...");

        // Parse and merge all HTML files
        let allParsed: any[] = [];
        for (let file of accountFiles) {
            const parsed = await parseHtmlFile(file);
            allParsed = allParsed.concat(parsed);
        }

        // Parse groups.xlsx if uploaded
        let groupsData: any[] = [];
        if (groupsFile) {
            groupsData = await parseGroupsFile(groupsFile);
        }

        // Generate merged HTML table for preview
        const mergedHtml = generateHtmlPreview(allParsed);

        setStatus("✅ Files processed successfully!");
        onUpload({ parsedAccounts: allParsed, htmlPreview: mergedHtml, groupsData });
    };

    return (
        <div className="p-6 border rounded-lg bg-gray-50 space-y-4">
            <div>
                <label className="block font-semibold mb-1">
                    Upload Accounts HTML Files (multiple allowed)
                </label>
                <input
                    type="file"
                    accept=".htm,.html"
                    multiple
                    onChange={handleAccountsUpload}
                    className="border p-2 rounded w-full"
                />
            </div>

            <div>
                <label className="block font-semibold mb-1">
                    Upload Groups Excel File (optional)
                </label>
                <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleGroupsUpload}
                    className="border p-2 rounded w-full"
                />
            </div>

            <button
                onClick={handleProcess}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
                Process Files
            </button>

            {message && (
                <p
                    className={`text-sm ${message.startsWith("❌") ? "text-red-600" : "text-green-600"
                        }`}
                >
                    {message}
                </p>
            )}
            {status && (
                <p
                    className={`text-sm ${status.startsWith("❌")
                            ? "text-red-600"
                            : status.startsWith("⏳")
                                ? "text-yellow-600"
                                : "text-green-600"
                        }`}
                >
                    {status}
                </p>
            )}
        </div>
    );
}
