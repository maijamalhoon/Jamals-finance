"use client";

const PDF_PAGE_WIDTH = 595;
const PDF_PAGE_HEIGHT = 842;

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

function normalizePortableText(value: string) {
  return value
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .normalize("NFKD")
    .replace(/[^\x20-\x7e\n]/g, "");
}

function escapePdfText(value: string) {
  return normalizePortableText(value).replace(/([\\()])/g, "\\$1");
}

function wrapText(value: string, maxCharacters: number) {
  const normalized = normalizePortableText(value).replace(/\s+/g, " ").trim();
  if (!normalized) return [""];

  const lines: string[] = [];
  let current = "";

  for (const word of normalized.split(" ")) {
    if (word.length > maxCharacters) {
      if (current) {
        lines.push(current);
        current = "";
      }

      let remaining = word;
      while (remaining.length > maxCharacters) {
        lines.push(remaining.slice(0, maxCharacters));
        remaining = remaining.slice(maxCharacters);
      }
      current = remaining;
      continue;
    }

    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharacters) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function drawText({
  font,
  size,
  x,
  y,
  text,
  gray = 0,
}: {
  font: "F1" | "F2";
  size: number;
  x: number;
  y: number;
  text: string;
  gray?: number;
}) {
  return `${gray.toFixed(2)} g\nBT\n/${font} ${size} Tf\n1 0 0 1 ${x} ${y} Tm\n(${escapePdfText(text)}) Tj\nET\n`;
}

function buildPdf(objects: string[]) {
  let pdf = "%PDF-1.4\n% Jamals Finance\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

export function createReceiptPdfBlob(receiptText: string) {
  const sourceLines = normalizePortableText(receiptText)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const detailLines = sourceLines.filter(
    (line) => !line.toLowerCase().includes("transaction receipt"),
  );
  const details = detailLines.map((line) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 1) return { label: "Detail", value: line };

    return {
      label: line.slice(0, separatorIndex).trim(),
      value: line.slice(separatorIndex + 1).trim(),
    };
  });

  let stream = "";
  stream += "1 g\n0 0 595 842 re f\n";
  stream += drawText({
    font: "F2",
    size: 18,
    x: 52,
    y: 790,
    text: "Jamal's Finance",
  });
  stream += drawText({
    font: "F1",
    size: 10,
    x: 52,
    y: 768,
    text: "TRANSACTION RECEIPT",
    gray: 0.42,
  });
  stream += "0.82 G\n0.8 w\n52 750 m\n543 750 l\nS\n";

  let y = 720;
  for (const detail of details) {
    const wrappedValue = wrapText(detail.value, 58);
    const isAmount = detail.label.toLowerCase() === "amount";

    stream += drawText({
      font: "F2",
      size: 9,
      x: 56,
      y,
      text: detail.label.toUpperCase(),
      gray: 0.42,
    });

    wrappedValue.forEach((line, index) => {
      stream += drawText({
        font: isAmount ? "F2" : "F1",
        size: isAmount ? 12 : 10.5,
        x: 176,
        y: y - index * 14,
        text: line,
      });
    });

    const rowHeight = Math.max(25, wrappedValue.length * 14 + 9);
    y -= rowHeight;
    stream += `0.92 G\n0.45 w\n56 ${y + 7} m\n539 ${y + 7} l\nS\n`;
  }

  stream += drawText({
    font: "F1",
    size: 8.5,
    x: 52,
    y: 48,
    text: "Generated securely by Jamal's Finance",
    gray: 0.48,
  });

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${byteLength(stream)} >>\nstream\n${stream}endstream`,
  ];

  return new Blob([buildPdf(objects)], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();

  window.setTimeout(() => {
    anchor.remove();
    window.URL.revokeObjectURL(url);
  }, 30_000);
}
