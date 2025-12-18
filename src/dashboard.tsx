import { useEffect, useState } from "react";

const Dashboard = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [newRow, setNewRow] = useState({
    CNTname: "",
    CNDmobilenumber: "",
    CNDemail: "",
    CNDskills: "",
  });

  const loadData = () => {
    fetch("http://localhost:5000/api/candidates")
      .then((res) => res.json())
      .then(setRows);
  };

  useEffect(loadData, []);

  const updateRow = (id: number, field: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const saveRow = (row: any) => {
    fetch(`http://localhost:5000/api/candidates/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    }).then(loadData);
  };

  const addRow = () => {
    fetch("http://localhost:5000/api/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRow),
    }).then(() => {
      setNewRow({ CNTname: "", CNDmobilenumber: "", CNDemail: "", CNDskills: "" });
      loadData();
    });
  };

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th><th>Mobile</th><th>Email</th><th>Skills</th><th>Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            {["CNTname", "CNDmobilenumber", "CNDemail", "CNDskills"].map((f) => (
              <td key={f}>
                <input
                  value={r[f]}
                  onChange={(e) => updateRow(r.id, f, e.target.value)}
                />
              </td>
            ))}
            <td><button onClick={() => saveRow(r)}>Save</button></td>
          </tr>
        ))}
        <tr>
          {Object.keys(newRow).map((f) => (
            <td key={f}>
              <input
                value={(newRow as any)[f]}
                onChange={(e) =>
                  setNewRow({ ...newRow, [f]: e.target.value })
                }
              />
            </td>
          ))}
          <td><button onClick={addRow}>Add</button></td>
        </tr>
      </tbody>
    </table>
  );
};

export default Dashboard;
