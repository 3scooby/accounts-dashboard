"use client";
import { useState } from "react";
import FileUploader from "../components/FileUploader";
import Report from "../components/Report";

export default function Home() {
  const [data, setData] = useState<any[]>([]);
  const [html, setHtml] = useState<string>("");

  const handleUpload = ({ parsed, html }: { parsed: any[]; html: string }) => {
    setData(parsed);
    setHtml(html);
  };

  return (
    <main className="max-w-5xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Accounts Report Generator</h1>
      <FileUploader onUpload={handleUpload} />

      {data.length > 0 && (
        <>
          <Report data={data} />
          <div className="mt-10">
            <h2 className="text-2xl font-semibold mb-3">Uploaded File Preview</h2>
            <div
              className="border rounded-lg p-4 bg-white overflow-auto max-h-[500px]"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </>
      )}
    </main>
  );
}
