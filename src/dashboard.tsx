import { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Cadidate {
  id: number;
  CNTname: string;
  role: string;
  year_of_experience: number;
  CNDemail?: string;
  CNDmobilenumber?: string;
  m1: number;
  m2: number;
  m3: number;
  m4: number;
}

const OPTIONS = [0, 10, 20];

const Dashboard = () => {
  const [data, setData] = useState<Cadidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  /* FILTER STATES */
  const [showFilter, setShowFilter] = useState(false);
  const [skillFilter, setSkillFilter] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("");

  /* EXPORT MENU */
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    fetchCadidates();
  }, []);

  const fetchCadidates = async () => {
    const res = await axios.get("http://localhost:5000/api/cadidates");
    setData(
      res.data.map((c: any) => ({
        id: c.id,
        CNTname: c.CNTname,
        role: c.role || "—",
        year_of_experience: c.year_of_experience || 0,
        CNDemail: c.CNDemail,
        CNDmobilenumber: c.CNDmobilenumber,
        m1: c.m1 ?? 0,
        m2: c.m2 ?? 0,
        m3: c.m3 ?? 0,
        m4: c.m4 ?? 0,
      }))
    );
  };

  /* FILTERED DATA */
  const filteredData = data.filter((row) => {
    if (skillFilter && row.role !== skillFilter) return false;
    if (
      experienceFilter &&
      row.year_of_experience < Number(experienceFilter)
    )
      return false;
    return true;
  });

  /* CHECKBOX HANDLERS */
  const toggleRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedIds(
      selectedIds.length === filteredData.length
        ? []
        : filteredData.map((r) => r.id)
    );
  };

  const selectedRows = filteredData.filter((r) =>
    selectedIds.includes(r.id)
  );

  /* PREDICTION */
  const calculatePrediction = (c: Cadidate) =>
    Math.round(((c.m1 + c.m2 + c.m3 + c.m4) / 80) * 100);

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
        r.CNTname,
        r.role,
        r.year_of_experience,
        r.CNDemail || "-",
        r.CNDmobilenumber || "-",
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
        Name: r.CNTname,
        Role: r.role,
        Experience: r.year_of_experience,
        Email: r.CNDemail,
        Mobile: r.CNDmobilenumber,
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
            </tr>
          </thead>

          <tbody>
            {filteredData.map((r) => {
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
                  <td>{r.CNTname}</td>
                  <td>{r.role}</td>

                  {(["m1", "m2", "m3", "m4"] as const).map((m) => (
                    <td key={m}>
                      <select
                        value={r[m]}
                        onChange={(e) =>
                          setData((prev) =>
                            prev.map((row) =>
                              row.id === r.id
                                ? { ...row, [m]: Number(e.target.value) }
                                : row
                            )
                          )
                        }
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
