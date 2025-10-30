"use client";

import { useState } from "react";
import FileUploader from "../components/FileUploader";
import Report from "../components/Report";

export default function Home() {
  const [data, setData] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [htmlPreview, setHtmlPreview] = useState("");

  const handleUpload = ({
    parsedAccounts,
    htmlPreview,
    groupsData,
  }: {
    parsedAccounts: any[];
    htmlPreview: string;
    groupsData: any[];
  }) => {
    setData(parsedAccounts);
    setGroups(groupsData);
    setHtmlPreview(htmlPreview);
  };

  return (
    <main className="max-w-6xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Accounts Report Generator
      </h1>

      <FileUploader onUpload={handleUpload} />

      {data.length > 0 && (
        <>
          <Report data={data} groups={groups} />

          <div className="mt-10">
            <h2 className="text-2xl font-semibold mb-3">Uploaded File Preview</h2>
            <div
              className="border rounded-lg p-4 bg-white overflow-auto max-h-[500px]"
              dangerouslySetInnerHTML={{ __html: htmlPreview }}
            />
          </div>
        </>
      )}
    </main>
  );
}
