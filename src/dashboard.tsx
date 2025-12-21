import { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface Cadidate {
  id: number;
  year_of_experience: number;
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

  /* FILTER STATES */
  const [showFilter, setShowFilter] = useState(false);
  const [skillFilter, setSkillFilter] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("");

  /* SELECTION STATES */
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

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
      year_of_experience: c.year_of_experience ?? 0,
      m1: c.m1 ?? 0,
      m2: c.m2 ?? 0,
      m3: c.m3 ?? 0,
      m4: c.m4 ?? 0,
    }));

    setData(normalized);
  };

  /* AUTO-CLOSE FILTER */
  const applyAndCloseFilter = () => {
    setShowFilter(false);
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

  /* FILTERED DATA */
  const filteredData = data.filter((row) => {
    if (skillFilter && row.role !== skillFilter) return false;

    if (experienceFilter) {
      if (row.year_of_experience < Number(experienceFilter)) {
        return false;
      }
    }

    return true;
  });

  /* CHECKBOX HANDLERS */
  const toggleRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (
      selectedIds.length === filteredData.length &&
      filteredData.length > 0
    ) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map((r) => r.id));
    }
  };

  /* EXPORT SELECTED */
  const exportSelectedPDF = () => {
    const rows = filteredData.filter((r) =>
      selectedIds.includes(r.id)
    );

    if (rows.length === 0) {
      alert("Please select at least one record");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Cadidates Export", 14, 20);

    (doc as any).autoTable({
      startY: 30,
      head: [
        [
          "Name",
          "Role",
          "Experience (Years)",
          "Email",
          "Mobile",
          "M1",
          "M2",
          "M3",
          "M4",
          "Prediction %",
        ],
      ],
      body: rows.map((r) => [
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
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <h2 className="dashboard-title">
            Candidate Joining Probability
          </h2>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="filter-btn"
              onClick={() => setShowFilter(!showFilter)}
            >
              🔽 Filters
            </button>

            <button
              className="filter-btn"
              onClick={exportSelectedPDF}
              style={{ background: "#2e7d32" }}
            >
              📤 Export
            </button>
          </div>
        </div>

        {showFilter && (
          <div className="filter-dropdown">
            <div className="filter-field">
              <label>Skills</label>
              <select
                value={skillFilter}
                onChange={(e) => {
                  setSkillFilter(e.target.value);
                  applyAndCloseFilter();
                }}
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
                onChange={(e) => {
                  setExperienceFilter(e.target.value);
                  applyAndCloseFilter();
                }}
              >
                <option value="">All</option>
                <option value="1">1+ years</option>
                <option value="2">2+ years</option>
                <option value="3">3+ years</option>
                <option value="4">4+ years</option>
                <option value="5">5+ years</option>
              </select>
            </div>
          </div>
        )}

        <div className="table-wrapper">
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
              {filteredData.map((row) => {
                const prediction = calculatePrediction(row);

                return (
                  <tr key={row.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => toggleRow(row.id)}
                      />
                    </td>
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
