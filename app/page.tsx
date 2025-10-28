"use client";
import FileUploader from "@/components/FileUploader";
import { summarizeAccounts } from "@/utils/summarizeAccounts";
import Report from "@/components/Report";
import { useState } from "react";

export default function Home() {
  const [data, setData] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);

  const handleData = (rows: any[]) => {
    setData(rows);
    setReport(summarizeAccounts(rows));
  };

  return (
    <main className="max-w-4xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Accounts Report Generator</h1>
      <FileUploader onData={handleData} />
      {report && <Report report={report} />}
    </main>
  );
}
