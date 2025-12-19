import { useEffect, useState } from "react";
import axios from "axios";

interface Candidate {
  id: number;
  CNTname: string;
  CNDmobilenumber: string;
  CNDemail: string;
  CNDskills: string;
  experience?: number;
  age?: number;
  dob?: string;
}

const Dashboard = () => {
  const [data, setData] = useState<Candidate[]>([]);
  const [filtered, setFiltered] = useState<Candidate[]>([]);

  // Filters
  const [experience, setExperience] = useState("");
  const [age, setAge] = useState("");
  const [dob, setDob] = useState("");
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [experience, age, dob, data]);

  const fetchData = async () => {
    const res = await axios.get("http://localhost:5000/api/candidates");

    const enriched = res.data.map((c: Candidate) => ({
      ...c,
      experience: Math.floor(Math.random() * 10) + 1,
      age: Math.floor(Math.random() * 30) + 20,
      dob: "1998-01-01",
    }));

    setData(enriched);
    setFiltered(enriched);
  };

  const applyFilters = () => {
    let result = [...data];

    if (experience) {
      result = result.filter(
        (c) => c.experience && c.experience >= Number(experience)
      );
    }

    if (age) {
      result = result.filter((c) => c.age === Number(age));
    }

    if (dob) {
      result = result.filter((c) => c.dob === dob);
    }

    setFiltered(result);
  };

  const handleChange = (
    id: number,
    field: keyof Candidate,
    value: string
  ) => {
    setFiltered((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const saveRow = async (row: Candidate) => {
    await axios.put(`http://localhost:5000/api/candidates/${row.id}`, row);
    alert("Saved");
  };

  const deleteRow = async (id: number) => {
    if (!window.confirm("Delete this row?")) return;

    await axios.delete(`http://localhost:5000/api/candidates/${id}`);
    setFiltered((prev) => prev.filter((r) => r.id !== id));
    setData((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <h2>Candidate Dashboard</h2>

          {/* FILTER BUTTON */}
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
                  <label>Min Experience (Years)</label>
                  <input
                    type="number"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                  />
                </div>

                <div className="filter-field">
                  <label>Age</label>
                  <select value={age} onChange={(e) => setAge(e.target.value)}>
                    <option value="">All</option>
                    {[20, 25, 30, 35, 40].map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>

                <div className="filter-actions">
                  <button
                    onClick={() => {
                      setExperience("");
                      setAge("");
                      setDob("");
                      setFiltered(data);
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
                <th>Mobile</th>
                <th>Email</th>
                <th>Skills</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      value={row.CNTname}
                      onChange={(e) =>
                        handleChange(row.id, "CNTname", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={row.CNDmobilenumber}
                      onChange={(e) =>
                        handleChange(row.id, "CNDmobilenumber", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={row.CNDemail}
                      onChange={(e) =>
                        handleChange(row.id, "CNDemail", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={row.CNDskills}
                      onChange={(e) =>
                        handleChange(row.id, "CNDskills", e.target.value)
                      }
                    />
                  </td>
                  <td className="actions">
                    <button onClick={() => saveRow(row)}>Save</button>
                    <button className="delete" onClick={() => deleteRow(row.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
