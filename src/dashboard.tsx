import { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface Cadidate {
  id: number;
  CNTname: string;
  role: string;
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

  /* 🔹 FILTER STATES (ADDED) */
  const [showFilter, setShowFilter] = useState(false);
  const [skillFilter, setSkillFilter] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("");

  useEffect(() => {
    fetchCadidates();
  }, []);

  const fetchCadidates = async () => {
    const res = await axios.get("http://localhost:5000/api/cadidates");

    const normalized = res.data.map((c: any) => ({
      id: c.id,
      CNTname: c.CNTname,
      role: c.role || "—",
      CNDemail: c.CNDemail,
      CNDmobilenumber: c.CNDmobilenumber,
      m1: c.m1 ?? 0,
      m2: c.m2 ?? 0,
      m3: c.m3 ?? 0,
      m4: c.m4 ?? 0,
    }));

    setData(normalized);
  };

  const updateMetric = (
    id: number,
    field: "m1" | "m2" | "m3" | "m4",
    value: number
  ) => {
    setData((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const calculatePrediction = (c: Cadidate) => {
    const total = c.m1 + c.m2 + c.m3 + c.m4;
    return Math.round((total / 80) * 100);
  };

  const getPredictionColor = (value: number) => {
    if (value <= 20) return "#d32f2f";
    if (value <= 60) return "#f57c00";
    return "#2e7d32";
  };

  const getMetricColor = (value: number) => {
    if (value === 0) return "#d32f2f";
    if (value === 10) return "#f57c00";
    return "#2e7d32";
  };

  /* 🔹 FILTER LOGIC (ADDED) */
  const filteredData = data.filter((row) => {
    if (skillFilter && row.role !== skillFilter) return false;

    if (experienceFilter) {
      const experienceYears = Math.floor(
        (row.m1 + row.m2 + row.m3 + row.m4) / 20
      );
      if (experienceYears < Number(experienceFilter)) return false;
    }

    return true;
  });

  /* 🔹 PDF EXPORT (UNCHANGED) */
  const exportCadidatePDF = (row: Cadidate) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Cadidate Details", 14, 20);

    doc.setFontSize(12);
    (doc as any).autoTable({
      startY: 30,
      theme: "grid",
      head: [["Field", "Value"]],
      body: [
        ["Name", row.CNTname],
        ["Role", row.role],
        ["Email", row.CNDemail || "-"],
        ["Mobile Number", row.CNDmobilenumber || "-"],
        ["M1", row.m1.toString()],
        ["M2", row.m2.toString()],
        ["M3", row.m3.toString()],
        ["M4", row.m4.toString()],
        ["Prediction (%)", `${calculatePrediction(row)}%`],
      ],
    });

    doc.save("export_data.pdf");
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <h2 className="dashboard-title">
            Candidate Joining Probability
          </h2>

          {/* 🔹 FILTER UI (ADDED) */}
          <div className="filter-wrapper">
            <button
              className="filter-btn"
              onClick={() => setShowFilter(!showFilter)}
            >
              🔽 Filters
            </button>

            {showFilter && (
              <div className="filter-dropdown">
                <div className="filter-field">
                  <label>Skills</label>
                  <select
                    value={skillFilter}
                    onChange={(e) =>
                      setSkillFilter(e.target.value)
                    }
                  >
                    <option value="">All</option>
                    {[...new Set(data.map((d) => d.role))].map(
                      (skill) => (
                        <option key={skill} value={skill}>
                          {skill}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="filter-field">
                  <label>Years of Experience</label>
                  <select
                    value={experienceFilter}
                    onChange={(e) =>
                      setExperienceFilter(e.target.value)
                    }
                  >
                    <option value="">All</option>
                    <option value="1">1+ years</option>
                    <option value="2">2+ years</option>
                    <option value="3">3+ years</option>
                    <option value="4">4+ years</option>
                  </select>
                </div>

                <div className="filter-actions">
                  <button
                    onClick={() => {
                      setSkillFilter("");
                      setExperienceFilter("");
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TABLE */}
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>M1</th>
                <th>M2</th>
                <th>M3</th>
                <th>M4</th>
                <th>Prediction (%)</th>
                <th>PDF</th>
              </tr>
            </thead>

            <tbody>
              {filteredData.map((row) => {
                const prediction = calculatePrediction(row);

                return (
                  <tr key={row.id}>
                    <td>{row.CNTname}</td>
                    <td>{row.role}</td>

                    {(["m1", "m2", "m3", "m4"] as const).map(
                      (metric) => (
                        <td key={metric}>
                          <select
                            value={row[metric]}
                            onChange={(e) =>
                              updateMetric(
                                row.id,
                                metric,
                                Number(e.target.value)
                              )
                            }
                            style={{
                              color: getMetricColor(row[metric]),
                              fontWeight: 600,
                            }}
                          >
                            {OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </td>
                      )
                    )}

                    <td
                      style={{
                        fontWeight: 700,
                        color: getPredictionColor(prediction),
                      }}
                    >
                      {prediction}%
                    </td>

                    <td style={{ textAlign: "center" }}>
                      <button
                        onClick={() => exportCadidatePDF(row)}
                        title="Download PDF"
                        style={{
                          background: "#1877f2",
                          color: "#fff",
                          border: "none",
                          padding: "6px 8px",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        📄
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
