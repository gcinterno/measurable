import { readApiResponseText } from "@/lib/api";
import { apiUrl } from "@/lib/api/config";

type UploadDatasetResponse = {
  id?: string | number;
  dataset_id?: string | number;
  datasetId?: string | number;
  data?: {
    id?: string | number;
    dataset_id?: string | number;
    datasetId?: string | number;
  };
};

function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("token");
}

function extractDatasetId(response: UploadDatasetResponse) {
  const datasetId =
    response.dataset_id ??
    response.datasetId ??
    response.id ??
    response.data?.dataset_id ??
    response.data?.datasetId ??
    response.data?.id;

  if (!datasetId) {
    throw new Error("Dataset id missing in upload response");
  }

  return String(datasetId);
}

export async function uploadDataset(file: File) {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(apiUrl("/datasets/excel"), {
    method: "POST",
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
    body: formData,
  });

  const text = await readApiResponseText("/datasets/excel", res);
  console.log("upload response:", text);

  const data = JSON.parse(text) as UploadDatasetResponse;

  return {
    raw: data,
    datasetId: extractDatasetId(data),
  };
}
