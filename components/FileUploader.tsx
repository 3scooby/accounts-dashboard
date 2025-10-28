"use client";
import { useState } from "react";
import Papa from "papaparse";

export default function FileUploader({ onData }: { onData: (rows: any[]) => void }) {
    const [fileName, setFileName] = useState("");

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);

        Papa.parse(file, {
            header: true,
            complete: (results) => {
                onData(results.data);
            },
        });
    };

    return (
        <div className="p-6 border rounded-lg bg-gray-50">
            <input type="file" accept=".csv" onChange={handleFile} />
            {fileName && <p className="mt-2 text-sm text-gray-600">Loaded: {fileName}</p>}
        </div>
    );
}
