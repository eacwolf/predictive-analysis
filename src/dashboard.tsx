import { useEffect, useState } from "react";

type Candidate = {
  id: number;
  CNTname: string;
  CNDmobilenumber: string;
  CNDemail: string;
  CNDskills: string;
};

const Dashboard = () => {
  const [data, setData] = useState<Candidate[]>([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/candidates")
      .then((res) => res.json())
      .then((result) => {
        console.log("BACKEND DATA:", result);
        setData(result);
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div>
      <h2>Candidate Dashboard</h2>

      <table border={1} cellPadding={8} cellSpacing={0} width="100%">
        <thead>
          <tr>
            <th>Name</th>
            <th>Mobile</th>
            <th>Email</th>
            <th>Skills</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              <td>{row.CNTname}</td>
              <td>{row.CNDmobilenumber}</td>
              <td>{row.CNDemail}</td>
              <td>{row.CNDskills}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Dashboard;
