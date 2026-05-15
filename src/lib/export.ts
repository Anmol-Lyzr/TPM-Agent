import * as XLSX from "xlsx";

export function slugifyFilename(name: string): string {
  return name
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export function datedFilename(base: string, ext: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${slugifyFilename(base)}-${date}.${ext}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type SheetRow = Record<string, string | number | boolean | null | undefined>;

export function exportRowsToExcel(
  filename: string,
  sheetName: string,
  rows: SheetRow[]
): void {
  if (rows.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(
    rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k, v ?? ""])
      )
    )
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export function markdownTableToRows(markdown: string): SheetRow[] {
  const lines = markdown
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|") && l.endsWith("|"));

  if (lines.length < 2) return [];

  const parseRow = (line: string) =>
    line
      .slice(1, -1)
      .split("|")
      .map((c) => c.trim());

  const headers = parseRow(lines[0]);
  const rows: SheetRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (/^\|[\s\-:|]+\|$/.test(lines[i])) continue;
    const cells = parseRow(lines[i]);
    const row: SheetRow = {};
    headers.forEach((h, idx) => {
      row[h || `Column ${idx + 1}`] = cells[idx] ?? "";
    });
    rows.push(row);
  }

  return rows;
}

/** Simple markdown → HTML for Word-compatible .doc export */
export function markdownToHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const parts: string[] = [];
  let inList = false;
  let listType: "ul" | "ol" = "ul";

  const closeList = () => {
    if (inList) {
      parts.push(`</${listType}>`);
      inList = false;
    }
  };

  const inline = (text: string) =>
    text
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      closeList();
      continue;
    }

    if (line.startsWith("|") && line.endsWith("|")) {
      closeList();
      parts.push(`<p style="font-family:Consolas,monospace;font-size:11px">${inline(line)}</p>`);
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      closeList();
      const level = Math.min(h[1].length + 1, 6);
      parts.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }

    const ol = line.match(/^\d+[.)]\s+(.+)$/);
    if (ol) {
      if (!inList || listType !== "ol") {
        closeList();
        parts.push("<ol>");
        inList = true;
        listType = "ol";
      }
      parts.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }

    if (/^[-*•]\s/.test(line)) {
      if (!inList || listType !== "ul") {
        closeList();
        parts.push("<ul>");
        inList = true;
        listType = "ul";
      }
      parts.push(`<li>${inline(line.replace(/^[-*•]\s+/, ""))}</li>`);
      continue;
    }

    closeList();
    parts.push(`<p>${inline(line)}</p>`);
  }

  closeList();
  return parts.join("\n");
}

export function exportHtmlToWordDocument(
  filename: string,
  title: string,
  bodyHtml: string
): void {
  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.5; }
  h1 { font-size: 18pt; color: #0b3b3a; }
  h2 { font-size: 14pt; margin-top: 14px; }
  h3 { font-size: 12pt; margin-top: 12px; color: #475569; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 10pt; }
  th { background: #f1f5f9; font-weight: 600; }
  ul, ol { margin: 8px 0 8px 20px; }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${bodyHtml}
</body>
</html>`;

  const blob = new Blob(["\ufeff", html], {
    type: "application/msword;charset=utf-8",
  });
  downloadBlob(blob, filename.endsWith(".doc") ? filename : `${filename}.doc`);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function rowsToHtmlTable(
  headers: string[],
  rows: (string | number)[][]
): string {
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${row.map((c) => `<td>${escapeHtml(String(c ?? ""))}</td>`).join("")}</tr>`
    )
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}
