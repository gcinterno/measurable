export function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}

export function formatDisplayNumber<T>(value: T): string {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  if (typeof value === "number") {
    return formatNumber(value);
  }

  const textValue = String(value).trim();

  if (!textValue) {
    return "N/A";
  }

  const normalized = textValue.replace(/,/g, "");

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return textValue;
  }

  const numericValue = Number(normalized);

  if (Number.isNaN(numericValue)) {
    return textValue;
  }

  const decimalPart = normalized.split(".")[1] || "";
  const maximumFractionDigits = decimalPart.length > 0 ? Math.min(decimalPart.length, 2) : 0;

  return formatNumber(numericValue, maximumFractionDigits);
}

export function formatStorageBytes(value?: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }

  const absoluteValue = Math.abs(value);
  const kilobyte = 1024;
  const megabyte = kilobyte * 1024;
  const gigabyte = megabyte * 1024;

  if (absoluteValue >= gigabyte) {
    return `${formatNumber(value / gigabyte, 1)} GB`;
  }

  if (absoluteValue >= megabyte) {
    return `${formatNumber(value / megabyte, 1)} MB`;
  }

  if (absoluteValue >= kilobyte) {
    return `${formatNumber(value / kilobyte, 1)} KB`;
  }

  return `${formatNumber(value, 0)} B`;
}
