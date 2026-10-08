/** Minimal RFC-4180 CSV parse/stringify/download (quotes, commas, newlines, BOM). */
function parse(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    const src = text.replace(/^﻿/, "");
    for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (inQuotes) {
            if (ch === '"') {
                if (src[i + 1] === '"') {
                    field += '"';
                    i++;
                }
                else
                    inQuotes = false;
            }
            else
                field += ch;
        }
        else if (ch === '"')
            inQuotes = true;
        else if (ch === ",") {
            row.push(field);
            field = "";
        }
        else if (ch === "\n" || ch === "\r") {
            if (ch === "\r" && src[i + 1] === "\n")
                i++;
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        }
        else
            field += ch;
    }
    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }
    const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
    if (nonEmpty.length === 0)
        return [];
    const headers = nonEmpty[0].map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
    return nonEmpty.slice(1).map((r) => {
        const obj = {};
        headers.forEach((h, idx) => (obj[h] = (r[idx] ?? "").trim()));
        return obj;
    });
}
function cell(v) {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function stringify(headers, rows) {
    return [headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}
function download(filename, content) {
    const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const csv = { parse, stringify, download };
