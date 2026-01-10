/**
 * File Upload Hook
 * Custom hook for file upload logic and state management
 */

import { useState } from "react";
import { parseCSVFile } from "@/lib/parseFile";
import type { FileType } from "@/types/reconciliation";

export interface UploadRecord {
  id: string;
  name: string;
  size: number;
  channel: "structured" | "supporting";
  fileType?: FileType;
  status: "pending" | "uploading" | "ready" | "error";
  message?: string;
  rowCount?: number;
  columnCount?: number;
}

/**
 * Extract period (YYYY-MM) from filename
 * Examples:
 * - "AP_Aging_2025-12.pdf" → "2025-12"
 * - "GL Summary Dec 31, 2025.pdf" → "2025-12"
 * - "Accounts Payable 12-2025.csv" → "2025-12"
 */
export function extractPeriodFromFilename(filename: string): string | undefined {
  // Pattern 1: YYYY-MM format
  const yearMonthMatch = filename.match(/(\d{4})-(\d{2})/);
  if (yearMonthMatch) {
    return `${yearMonthMatch[1]}-${yearMonthMatch[2]}`;
  }

  // Pattern 2: MM-YYYY or MM/YYYY format
  const monthYearMatch = filename.match(/(\d{2})[-/](\d{4})/);
  if (monthYearMatch) {
    return `${monthYearMatch[2]}-${monthYearMatch[1]}`;
  }

  // Pattern 3: Month name YYYY (e.g., "December 2025" or "Dec 2025")
  const monthNameMatch = filename.match(
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})[,\s]+(\d{4})/i
  );
  if (monthNameMatch) {
    const monthMap: Record<string, string> = {
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dec: "12",
    };
    const month = monthMap[monthNameMatch[1].toLowerCase().slice(0, 3)];
    return `${monthNameMatch[3]}-${month}`;
  }

  return undefined;
}

/**
 * Custom hook for file upload state and logic
 */
export function useFileUpload() {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);

  const removeUploadByFileType = (fileType: FileType) => {
    setUploads((records) => records.filter((record) => record.fileType !== fileType));
  };

  const handleStructuredFiles = async (
    files: FileList | null,
    fileType: FileType,
    onFileSet: (file: any) => void
  ) => {
    if (!files?.length) return;

    const file = files[0]; // Only take first file

    // Remove existing uploads for this file type
    removeUploadByFileType(fileType);

    const pending: UploadRecord = {
      id: `${Date.now()}-${file.name}`,
      name: file.name,
      channel: "structured",
      fileType,
      size: file.size,
      status: "pending",
    };

    setUploads((records) => [pending, ...records]);

    // Parse CSV file
    const parseResult = await parseCSVFile(file, fileType);

    if (!parseResult.success) {
      setUploads((records) =>
        records.map((entry) =>
          entry.id === pending.id
            ? {
                ...entry,
                status: "error",
                message: parseResult.error || "Failed to parse file",
              }
            : entry
        )
      );
      return;
    }

    // Extract period from filename if not in data
    const extractedPeriod = extractPeriodFromFilename(file.name);

    // Prepare parsed file with metadata
    const parsedFile = {
      ...parseResult.data!,
      metadata: {
        ...parseResult.data!.metadata,
        period: parseResult.data!.metadata?.period || extractedPeriod,
        currency: parseResult.data!.metadata?.currency || "USD",
      },
    };

    // Update upload record
    setUploads((records) =>
      records.map((entry) =>
        entry.id === pending.id
          ? {
              ...entry,
              status: "uploading",
              rowCount: parsedFile.rowCount,
              columnCount: parsedFile.columnCount,
            }
          : entry
      )
    );

    try {
      // Upload to API
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "structured");

      const uploadResponse = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const payload = await uploadResponse.json();

      // Update Zustand store
      onFileSet(parsedFile);

      // Mark as ready
      setUploads((records) =>
        records.map((entry) =>
          entry.id === pending.id
            ? {
                ...entry,
                status: "ready",
                message: `stored as ${payload.fileName}`,
              }
            : entry
        )
      );
    } catch (error) {
      setUploads((records) =>
        records.map((entry) =>
          entry.id === pending.id
            ? {
                ...entry,
                status: "error",
                message: error instanceof Error ? error.message : "Upload failed",
              }
            : entry
        )
      );
    }
  };

  const handleSupportingFiles = async (files: FileList | null) => {
    if (!files?.length) return;

    const pendingRecords: UploadRecord[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${file.name}`,
      name: file.name,
      channel: "supporting",
      size: file.size,
      status: "pending",
    }));

    setUploads((records) => [...pendingRecords, ...records]);

    // Upload each file
    await Promise.all(
      pendingRecords.map(async (record) => {
        const file = Array.from(files).find((f) => `${Date.now()}-${f.name}` === record.id);
        if (!file) return;

        try {
          setUploads((records) =>
            records.map((entry) =>
              entry.id === record.id ? { ...entry, status: "uploading" } : entry
            )
          );

          const formData = new FormData();
          formData.append("file", file);
          formData.append("kind", "supporting");

          const response = await fetch("/api/uploads", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error("Upload failed");
          }

          const payload = await response.json();

          setUploads((records) =>
            records.map((entry) =>
              entry.id === record.id
                ? {
                    ...entry,
                    status: "ready",
                    message: `stored as ${payload.fileName}`,
                  }
                : entry
            )
          );
        } catch (error) {
          setUploads((records) =>
            records.map((entry) =>
              entry.id === record.id
                ? {
                    ...entry,
                    status: "error",
                    message: error instanceof Error ? error.message : "Upload failed",
                  }
                : entry
            )
          );
        }
      })
    );
  };

  const clearUploads = () => {
    setUploads([]);
  };

  return {
    uploads,
    handleStructuredFiles,
    handleSupportingFiles,
    removeUploadByFileType,
    clearUploads,
  };
}
