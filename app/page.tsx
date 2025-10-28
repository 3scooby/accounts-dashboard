"use client";
import { useState } from "react";
import FileUploader from "../components/FileUploader";
import Report from "../components/Report";

export default function Home() {
  const [data, setData] = useState<any[]>([]);

  return (
    <main className="max-w-4xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Accounts Report Generator</h1>
      <FileUploader onData={setData} />
      {data.length > 0 && <Report data={data} />}
    </main>
  );
}
