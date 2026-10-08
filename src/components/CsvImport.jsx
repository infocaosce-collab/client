import { useState } from "react";
import { FileSpreadsheet, Download } from "lucide-react";
import { Button } from "./Button";
import { FileDropzone } from "./FileDropzone";
import { RadioGroup, RadioGroupItem } from "./RadioGroup";
import { csv } from "../helpers/csv";
import styles from "./CsvImport.module.css";
export function CsvImport({ title, description, templateName, templateHeaders, templateSample, mapRows, onImport, replaceHint, className, }) {
    const [parsed, setParsed] = useState(null);
    const [mode, setMode] = useState("append");
    const [busy, setBusy] = useState(false);
    const onFiles = async (files) => {
        const file = files[0];
        if (!file)
            return;
        const text = await file.text();
        const records = csv.parse(text);
        const result = records.length === 0 ? { rows: [], errors: ["The file has no data rows."] } : mapRows(records);
        setParsed({ ...result, fileName: file.name });
    };
    const run = async () => {
        if (!parsed || parsed.rows.length === 0)
            return;
        setBusy(true);
        try {
            await onImport(parsed.rows, mode);
            setParsed(null);
        }
        catch {
            // toast is shown by the mutation
        }
        finally {
            setBusy(false);
        }
    };
    return (<div className={`${styles.box} ${className ?? ""}`}>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>
            <FileSpreadsheet size={18}/> {title}
          </div>
          <div className={styles.desc}>{description}</div>
        </div>
        <Button variant="outline" size="sm" onClick={() => csv.download(templateName, csv.stringify(templateHeaders, templateSample))}>
          <Download size={14}/> Template
        </Button>
      </div>
      <div className={styles.headers}>
        Columns: <code>{templateHeaders.join(", ")}</code>
      </div>
      <FileDropzone accept=".csv,text/csv" maxSize={5 * 1024 * 1024} onFilesSelected={onFiles} title="Drop a .csv file or click to choose" subtitle="Save from Excel as “CSV UTF-8”" icon={<FileSpreadsheet size={28}/>}/>
      {parsed ? (<div className={styles.preview}>
          <div>
            <strong>{parsed.fileName}</strong>: {parsed.rows.length} valid row{parsed.rows.length === 1 ? "" : "s"}
            {parsed.errors.length > 0 ? `, ${parsed.errors.length} skipped` : ""}
          </div>
          {parsed.errors.length > 0 ? (<ul className={styles.errors}>
              {parsed.errors.slice(0, 8).map((e, i) => (<li key={i}>{e}</li>))}
              {parsed.errors.length > 8 ? <li>…and {parsed.errors.length - 8} more</li> : null}
            </ul>) : null}
          <RadioGroup value={mode} onValueChange={(v) => setMode(v)} className={styles.modes}>
            <label className={styles.mode}>
              <RadioGroupItem value="append"/> Add / update
            </label>
            <label className={styles.mode}>
              <RadioGroupItem value="replace"/> Replace — {replaceHint}
            </label>
          </RadioGroup>
          <div className={styles.actions}>
            <Button variant="ghost" onClick={() => setParsed(null)}>
              Cancel
            </Button>
            <Button onClick={run} disabled={busy || parsed.rows.length === 0}>
              Import {parsed.rows.length} row{parsed.rows.length === 1 ? "" : "s"}
            </Button>
          </div>
        </div>) : null}
    </div>);
}
