import React, { useRef, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

const sources: { name: string; desc: string }[] = [
  { name: "Excel", desc: "Upload Excel/CSV spreadsheets" },
  { name: "Google Sheet", desc: "Upload a Google Sheets export (.xlsx or .csv)" },
];

const DataConnect = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, unknown>[]>([]);
  const [messages, setMessages] = useState<string[]>([]);
  const [pendingImport, setPendingImport] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [serverFilename, setServerFilename] = useState<string | null>(null);

  // ensure axios has Authorization header if token exists (handles page reloads)
  const existingToken = localStorage.getItem("token");
  if (existingToken) axios.defaults.headers.common["Authorization"] = `Bearer ${existingToken}`;

  const handleConnect = (name: string) => {
    setAction(name);
    setMessages([]);

    // Excel opens the file selector
    // Excel and Google Sheet both open the file selector (user uploads exported file)
    if (name === "Excel" || name === "Google Sheet") {
      // Open file selector for spreadsheets
      if (fileInputRef.current) {
        fileInputRef.current.accept = ".xlsx,.xls,.csv";
        fileInputRef.current.multiple = false;
        fileInputRef.current.click();
      }
      return;
    }

    // other actions are not supported
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    if (action === "Excel" || action === "Google Sheet") {
      // For large files, avoid client-side parsing. Upload to backend to parse there and return row count.
      const f = fileArray[0];
      try {
        const form = new FormData();
        form.append("file", f);
        setMessages((m) => [...m, `Uploading ${f.name} ...`]);
        const resp = await axios.post("http://localhost:5000/api/upload-parse", form, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (p) => {
            const pct = Math.round((p.loaded / (p.total || 1)) * 100);
            setMessages((m) => [...m.filter(Boolean).slice(-3), `Upload progress: ${pct}%`]);
          },
        });

        const filename = resp?.data?.filename;
        const rowCount = resp?.data?.rowCount ?? 0;
        setServerFilename(filename || null);
        setPendingImport(true);
        setPendingCount(rowCount);
        setMessages((m) => [...m, `Data uploaded successfully (${rowCount} rows).`]);
      } catch (err: unknown) {
        const text = err instanceof Error ? err.message : String(err);
        setMessages((m) => [...m, `Upload failed: ${text}`]);
      }

      return;
    }

    // Other actions not supported
    setMessages((m) => [...m, `No handler for action: ${action}`]);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // reset value so selecting same file again triggers change
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCancelImport = () => {
    setParsedData([]);
    setPendingImport(false);
    setPendingCount(0);
    setServerFilename(null);
    setMessages((m) => [...m, "Upload canceled"]);
  };

  const handleProceedImport = async () => {
    if (!serverFilename) {
      setMessages((m) => [...m, "No uploaded file to import"]);
      return;
    }

    try {
      setMessages((m) => [...m, `Processing import on server...`]);
      const resp = await axios.post("http://localhost:5000/api/import-file", { filename: serverFilename });
      const inserted = resp?.data?.inserted ?? 0;
      setMessages((m) => [...m, `Imported rows: ${inserted}`]);
      setParsedData([]);
      setPendingImport(false);
      setPendingCount(0);
      setServerFilename(null);
    } catch (err: any) {
      const status = err?.response?.status;
      const body = err?.response?.data;
      if (status === 401) {
        setMessages((m) => [...m, `Import failed: Unauthorized (please login)`]);
        // clear local auth and redirect to login to refresh token
        localStorage.removeItem("token");
        localStorage.removeItem("session");
        window.dispatchEvent(new Event('authChanged'));
        return;
      }
      const text = body?.error || err?.message || String(err);
      setMessages((m) => [...m, `Import failed: ${text}`]);
    }
  };

  // onDrop/onDragOver handlers are implemented per-card for the drag target

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>Connect Data Source</h1>
        <p style={styles.subtitle}>
          Convert your raw data into structured analytics-ready format
        </p>

        <div style={styles.grid}>
          {sources.map((s) => (
            <div key={s.name} style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>{s.name}</h3>
              </div>
              <p style={styles.cardDesc}>{s.desc}</p>
              <button style={styles.button} onClick={() => handleConnect(s.name)}>
                Upload
              </button>
            </div>
          ))}
        </div>

        {/* Drop zone is the Drag Files to Upload card itself; no separate drop box */}

        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={onInputChange}
        />

        <div style={{ marginTop: 20 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ color: "#333" }}>
              {m}
            </div>
          ))}

          

          {pendingImport ? (
            <div style={{ marginTop: 12 }}>
              <strong>Data uploaded successfully ({pendingCount} rows)</strong>
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button style={{ ...styles.button, background: "#2e7d32" }} onClick={handleProceedImport}>
                  Proceed
                </button>
                <button style={{ ...styles.button, background: "#d32f2f" }} onClick={handleCancelImport}>
                  Cancel
                </button>
              </div>
            </div>
          ) : parsedData.length > 0 ? (
            <div style={{ marginTop: 12 }}>
              <strong>Preview (first 5 rows):</strong>
              <pre style={{ maxHeight: 200, overflow: "auto" }}>
                {JSON.stringify(parsedData.slice(0, 5), null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default DataConnect;

/* ---------- STYLES ---------- */
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f0f2f5",
    display: "flex",
    justifyContent: "center",
    padding: "40px 20px",
  },

  container: {
    width: "100%",
    maxWidth: "1100px",
    background: "#ffffff",
    padding: "32px",
    borderRadius: "12px",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  },

  title: {
    fontSize: "26px",
    fontWeight: 600,
    marginBottom: "6px",
  },

  subtitle: {
    fontSize: "14px",
    color: "#666",
    marginBottom: "28px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "24px",
  },

  card: {
    background: "#f9fafb",
    borderRadius: "10px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },

  cardHeader: {
    marginBottom: "10px",
  },

  cardTitle: {
    fontSize: "18px",
    fontWeight: 600,
    margin: 0,
  },

  cardDesc: {
    fontSize: "14px",
    color: "#555",
    marginBottom: "20px",
    flexGrow: 1,
  },

  button: {
    alignSelf: "flex-start",
    padding: "8px 16px",
    background: "#1877f2",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
  },
};
