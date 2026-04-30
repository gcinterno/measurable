import { useEffect, useState } from "react";

import { ReportLibraryCard } from "@/components/reports/ReportLibraryCard";
import type { Report } from "@/types/report";

type RecentReportCardProps = {
  report: Report;
  onDeleted?: (reportId: string) => void;
};

const REPORT_FOLDERS_KEY = "reportFolders";
const REPORT_FOLDER_ASSIGNMENTS_KEY = "reportFolderAssignments";

type ReportFolder = {
  id: string;
  name: string;
};

function loadStoredFolders() {
  if (typeof window === "undefined") {
    return [] as ReportFolder[];
  }

  try {
    const raw = window.localStorage.getItem(REPORT_FOLDERS_KEY);
    return raw ? (JSON.parse(raw) as ReportFolder[]) : [];
  } catch {
    return [];
  }
}

function loadStoredAssignments() {
  if (typeof window === "undefined") {
    return {} as Record<string, string>;
  }

  try {
    const raw = window.localStorage.getItem(REPORT_FOLDER_ASSIGNMENTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function RecentReportCard({ report, onDeleted }: RecentReportCardProps) {
  const [folders, setFolders] = useState<ReportFolder[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    setFolders(loadStoredFolders());
    setAssignments(loadStoredAssignments());
  }, []);

  return (
    <ReportLibraryCard
      report={report}
      folders={folders}
      folderId={assignments[report.id] || ""}
      onMoveToFolder={(reportId, nextFolderId) => {
        if (typeof window === "undefined") {
          return;
        }

        const nextAssignments = JSON.parse(
          window.localStorage.getItem("reportFolderAssignments") || "{}"
        ) as Record<string, string>;

        if (!nextFolderId) {
          delete nextAssignments[reportId];
        } else {
          nextAssignments[reportId] = nextFolderId;
        }

        window.localStorage.setItem(
          REPORT_FOLDER_ASSIGNMENTS_KEY,
          JSON.stringify(nextAssignments)
        );
        setAssignments(nextAssignments);
      }}
      onDeleted={onDeleted}
    />
  );
}
