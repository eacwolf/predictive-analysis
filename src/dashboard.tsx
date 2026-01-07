import { useEffect, useState, useRef } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Cadidate {
  id: number;
  // normalized fields used by the UI
  name: string;
  role: string;
  experience: number;
  email?: string;
  mobile?: string;
  m1: number;
  m2: number;
  m3: number;
  m4: number;
}

// Candidate shape as returned from the backend (partial / loose)
interface BackendCandidate {
  id?: number | string;
  name?: string;
  CNTname?: string;
  CNName?: string;
  role?: string;
  role_name?: string;
  experience?: number | string;
  year_of_experience?: number | string;
  email?: string;
  CNDemail?: string;
  CNEmail?: string;
  mobile?: string;
  CNDmobilenumber?: string;
  CNMobileNumber?: string;
  m1?: number | string;
  m2?: number | string;
  m3?: number | string;
  m4?: number | string;
  [key: string]: unknown;
}

const OPTIONS = [0, 10, 20];

const Dashboard = () => {
  const [data, setData] = useState<Cadidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;
  const [messages, setMessages] = useState<{ id: number; text: string }[]>([]);
  const msgIdRef = useRef(1);

  const showMessage = (text: string, ttl = 3000) => {
    const id = msgIdRef.current++;
    setMessages((m) => [...m, { id, text }]);
    setTimeout(() => {
      setMessages((m) => m.filter((mm) => mm.id !== id));
    }, ttl);
  };

  // ensure axios uses existing token (set once)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }, []);

  /* FILTER STATES */
  const [showFilter, setShowFilter] = useState(false);
  const [skillFilter, setSkillFilter] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("");

  /* EXPORT MENU */
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/cadidates");
        if (!mounted) return;
        setData(
          (res.data as BackendCandidate[]).map((c) => ({
            id: Number(c.id ?? 0),
            // accept either normalized keys or DB column names (CNTname / CNDemail / CNDmobilenumber)
            name: c.name ?? (c.CNTname as string) ?? (c.CNName as string) ?? "",
            role: c.role ?? (c.role_name as string) ?? "—",
            experience: Number(c.experience ?? c.year_of_experience ?? 0),
            email: (c.email as string) ?? (c.CNDemail as string) ?? (c.CNEmail as string) ?? "",
            mobile: (c.mobile as string) ?? (c.CNDmobilenumber as string) ?? (c.CNMobileNumber as string) ?? "",
            m1: Number(c.m1 ?? 0),
            m2: Number(c.m2 ?? 0),
            m3: Number(c.m3 ?? 0),
            m4: Number(c.m4 ?? 0),
          }))
        );
        } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        showMessage(`Failed to fetch candidates: ${errMsg}`);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* FILTERED DATA */
  const filteredData = data.filter((row) => {
    if (skillFilter && row.role !== skillFilter) return false;
    if (
      experienceFilter &&
      row.experience < Number(experienceFilter)
    )
      return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const paginatedData = filteredData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* CHECKBOX HANDLERS */
  const toggleRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    // Toggle selection for currently visible page only
    const visibleIds = paginatedData.map((r) => r.id);
    const allVisibleSelected = visibleIds.every((id) => selectedIds.includes(id)) && visibleIds.length > 0;
    setSelectedIds((prev) => (allVisibleSelected ? prev.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...prev, ...visibleIds]))));
  };

  const selectedRows = filteredData.filter((r) => selectedIds.includes(r.id));

  const handleDelete = async (id: number) => {
    if (!confirm("Permanently delete this record? This cannot be undone.")) return;
    // optimistic removal
    const prev = data;
    setData((d) => d.filter((r) => r.id !== id));
    try {
      const resp = await axios.delete(`http://localhost:5000/api/candidate/${id}`);
      if (!(resp.data && resp.data.ok)) {
        setData(prev);
        showMessage(`Delete failed: ${resp.data?.error || 'unknown'}`);
      } else {
        showMessage(`Deleted record id ${id}`);
      }
    } catch (err: unknown) {
      setData(prev);
      type ErrResp = { response?: { status?: number; data?: unknown }; message?: string };
      const e = err as ErrResp;
      const status = e.response?.status;
      const body = e.response?.data;
      let errorText = 'unknown';
      if (body && typeof body === 'object' && 'error' in body) {
        const b = body as Record<string, unknown>;
        errorText = String(b.error ?? JSON.stringify(b));
      } else if (e.message) {
        errorText = e.message;
      } else if (body != null) {
        errorText = String(body);
      }
      showMessage(`Delete failed${status ? ` (status ${status})` : ''}: ${errorText}`);
    }
  };

  // Immediate metric update: optimistic update in UI and persist to backend
  const handleMetricChange = async (
    id: number,
    metric: 'm1' | 'm2' | 'm3' | 'm4',
    value: number
  ) => {
    // store previous value to revert on error
    const prevRow = data.find((d) => d.id === id);
    const prevValue = prevRow ? prevRow[metric] : undefined;

    // optimistic update in UI
    setData((prev) => prev.map((row) => (row.id === id ? { ...row, [metric]: value } : row)));

    try {
      await axios.put(`http://localhost:5000/api/candidate/${id}`, { [metric]: value });
    } catch (err: unknown) {
      // revert on error
      setData((prev) => prev.map((row) => (row.id === id ? { ...row, [metric]: prevValue } : row)));
      const errMsg = err instanceof Error ? err.message : String(err);
      showMessage(`Update failed for ${metric} on id ${id}: ${errMsg || 'unknown'}`);
    }
  };

  /* PREDICTION */
  const calculatePrediction = (c: Cadidate) => {
    // Compute a percentage from the sum of metrics, then cap between 0 and 100
    const raw = Math.round(((c.m1 + c.m2 + c.m3 + c.m4) / 80) * 100);
    const capped = Math.max(0, Math.min(100, raw));
    return capped;
  };

  const metricColor = (v: number) =>
    v === 0 ? "#d32f2f" : v === 10 ? "#f57c00" : "#2e7d32";

  const predictionColor = (v: number) =>
    v <= 20 ? "#d32f2f" : v <= 60 ? "#f57c00" : "#2e7d32";

  /* EXPORT PDF */
  const exportPDF = () => {
    if (!selectedRows.length) {
      alert("Please select records to export");
      return;
    }

    const doc = new jsPDF();
    doc.text("Cadidates Export", 14, 20);

    autoTable(doc, {
      startY: 30,
      head: [
        [
          "Name",
          "Role",
          "Experience",
          "Email",
          "Mobile",
          "M1",
          "M2",
          "M3",
          "M4",
          "Prediction %",
        ],
      ],
      body: selectedRows.map((r) => [
        r.name,
        r.role,
        r.experience,
        r.email || "-",
        r.mobile || "-",
        r.m1,
        r.m2,
        r.m3,
        r.m4,
        `${calculatePrediction(r)}%`,
      ]),
    });

    doc.save("export_data.pdf");
    setShowExport(false);
  };

  /* EXPORT EXCEL */
  const exportExcel = () => {
    if (!selectedRows.length) {
      alert("Please select records to export");
      return;
    }

    const sheet = XLSX.utils.json_to_sheet(
      selectedRows.map((r) => ({
        Name: r.name,
        Role: r.role,
        Experience: r.experience,
        Email: r.email,
        Mobile: r.mobile,
        M1: r.m1,
        M2: r.m2,
        M3: r.m3,
        M4: r.m4,
        Prediction: `${calculatePrediction(r)}%`,
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Cadidates");
    XLSX.writeFile(wb, "export_data.xlsx");
    setShowExport(false);
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <h2>Candidate Joining Probability</h2>

          <div style={{ display: "flex", gap: "10px" }}>
            <button className="filter-btn" onClick={() => setShowFilter(!showFilter)}>
              🔽 Filters
            </button>

            <div className="filter-wrapper">
              <button
                className="filter-btn"
                onClick={() => setShowExport(!showExport)}
              >
                📤 Export
              </button>

              {showExport && (
                <div className="filter-dropdown">
                  <button onClick={exportPDF}>📄 Export PDF</button>
                  <button onClick={exportExcel}>📊 Export Excel</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {showFilter && (
          <div className="filter-dropdown">
            <label>Skills</label>
            <select
              value={skillFilter}
              onChange={(e) => {
                setSkillFilter(e.target.value);
                setShowFilter(false);
              }}
            >
              <option value="">All</option>
              {[...new Set(data.map((d) => d.role))].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>

            <label>Experience</label>
            <select
              value={experienceFilter}
              onChange={(e) => {
                setExperienceFilter(e.target.value);
                setShowFilter(false);
              }}
            >
              <option value="">All</option>
              <option value="1">1+ years</option>
              <option value="2">2+ years</option>
              <option value="3">3+ years</option>
              <option value="4">4+ years</option>
            </select>
          </div>
        )}

        {/* Inline messages */}
        <div style={{ marginTop: 12 }}>
          {messages.map((m) => (
            <div key={m.id} style={{ color: "#333" }}>
              {m.text}
            </div>
          ))}
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    selectedIds.length === filteredData.length &&
                    filteredData.length > 0
                  }
                  onChange={toggleAll}
                />
              </th>
              <th>Name</th>
              <th>Role</th>
              <th>M1</th>
              <th>M2</th>
              <th>M3</th>
              <th>M4</th>
              <th>Prediction</th>
              <th>Delete</th>
            </tr>
          </thead>

          <tbody>
            {paginatedData.map((r) => {
              const p = calculatePrediction(r);

              return (
                <tr key={r.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(r.id)}
                      onChange={() => toggleRow(r.id)}
                    />
                  </td>
                  <td>{r.name}</td>
                  <td>{r.role}</td>

                  {(["m1", "m2", "m3", "m4"] as const).map((m) => (
                    <td key={m}>
                      <select
                        value={r[m]}
                        onChange={(e) => handleMetricChange(r.id, m, Number(e.target.value))}
                        style={{
                          color: metricColor(r[m]),
                          fontWeight: 600,
                        }}
                      >
                        {OPTIONS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </td>
                  ))}

                  <td style={{ color: predictionColor(p), fontWeight: 700 }}>
                    {p}%
                  </td>
                  <td>
                    <button
                      className="filter-btn"
                      onClick={() => handleDelete(r.id)}
                      style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <div>
            Page {page} of {totalPages} — {filteredData.length} records
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="filter-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              ◀ Prev
            </button>
            <button className="filter-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
