import { useEffect, useState } from "react";
import axios from "axios";

interface Candidate {
  id: number;
  CNTname: string;
  CNDmobilenumber: string;
  CNDemail: string;
  CNDskills: string;
}

const Dashboard = () => {
  const [data, setData] = useState<Candidate[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const res = await axios.get("http://localhost:5000/api/candidates");
    setData(res.data);
  };

  const handleChange = (
    id: number,
    field: keyof Candidate,
    value: string
  ) => {
    setData((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const saveRow = async (row: Candidate) => {
    await axios.put(
      `http://localhost:5000/api/candidates/${row.id}`,
      row
    );
    alert("Saved to database");
  };

  const deleteRow = async (id: number) => {
    if (!window.confirm("Delete this row?")) return;

    await axios.delete(
      `http://localhost:5000/api/candidates/${id}`
    );

    setData((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="dashboard-wrapper">
      <h2>Candidate Dashboard</h2>

      <table>
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
          {data.map((row) => (
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
                    handleChange(
                      row.id,
                      "CNDmobilenumber",
                      e.target.value
                    )
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

              <td>
                <button onClick={() => saveRow(row)}>Save</button>
                <button
                  onClick={() => deleteRow(row.id)}
                  className="delete"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Dashboard;
