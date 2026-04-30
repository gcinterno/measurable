"use client";

type UploadDropzoneProps = {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  helperText?: string;
};

const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

function isAcceptedFile(file: File) {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension));
}

export function UploadDropzone({
  file,
  onFileSelect,
  onError,
  disabled = false,
  helperText,
}: UploadDropzoneProps) {
  function handleFiles(selectedFile: File | null) {
    if (!selectedFile) {
      onFileSelect(null);
      return;
    }

    if (!isAcceptedFile(selectedFile)) {
      onError?.("Select a .xlsx, .xls, or .csv file.");
      onFileSelect(null);
      return;
    }

    onFileSelect(selectedFile);
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    handleFiles(event.target.files?.[0] || null);
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();

    if (disabled) {
      return;
    }

    handleFiles(event.dataTransfer.files?.[0] || null);
  }

  return (
    <label
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      className={`mt-8 block rounded-[28px] border border-dashed p-6 sm:p-10 ${
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-100"
          : "cursor-pointer border-slate-300 bg-slate-50"
      }`}
    >
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        className="sr-only"
        onChange={handleInputChange}
        disabled={disabled}
      />
      <div className="flex flex-col items-center text-center">
        <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[24px] bg-slate-950 text-white">
          <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 stroke-white">
            <path
              d="M12 16V7M8.5 10.5L12 7l3.5 3.5M5 17.5v.5A2.5 2.5 0 0 0 7.5 20.5h9A2.5 2.5 0 0 0 19 18v-.5"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h3 className="mt-5 text-2xl font-semibold text-slate-950">
          Upload report inputs
        </h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
          Drag a file here or select one from your computer. Excel and CSV formats are accepted.
        </p>
        <span className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
          {file ? "Change file" : "Browse files"}
        </span>
        <p className="mt-4 text-sm text-slate-500">
          {file ? file.name : "No file selected"}
        </p>
        {helperText ? (
          <p className="mt-2 text-sm text-slate-400">{helperText}</p>
        ) : null}
      </div>
    </label>
  );
}
