"use client";
import { useState } from "react";

export default function FileUploader({
    onUpload,
}: {
    onUpload: (data: { parsed: any[]; html: string }) => void;
}) {
    const [message, setMessage] = useState("");
    const [fileName, setFileName] = useState("");

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // ✅ Enforce file name
        if (file.name.toLowerCase() !== "accounts.htm") {
            setMessage("❌ Please upload a file named exactly 'Accounts.htm'.");
            setFileName("");
            e.target.value = "";
            return;
        }

        setFileName(file.name);
        setMessage("✅ File accepted: " + file.name);

        const reader = new FileReader();
        reader.onload = (event) => {
            const html = event.target?.result as string;

            // ✅ Parse HTML table
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            const rows = Array.from(doc.querySelectorAll("table tr"));

            const parsed = rows
                .map((tr) =>
                    Array.from(tr.querySelectorAll("td, th")).map((td) => td.textContent?.trim())
                )
                .filter((r) => r.length > 1)
                .map((r) => ({
                    Login: r[0],
                    Name: r[1],
                }))
                .slice(1); // skip header row

            onUpload({ parsed, html });
        };

        reader.readAsText(file);
    };

    return (
        <div className="p-6 border rounded-lg bg-gray-50">
            <input type="file" accept=".htm" onChange={handleFile} />
            {message && (
                <p
                    className={`mt-2 text-sm ${message.startsWith("❌") ? "text-red-600" : "text-green-600"
                        }`}
                >
                    {message}
                </p>
            )}
            {fileName && <p className="mt-1 text-xs text-gray-500">Loaded: {fileName}</p>}
        </div>
    );
}
