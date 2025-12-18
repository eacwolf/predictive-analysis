const sources = [
  { name: "AWS S3", desc: "Unstructured resumes & files" },
  { name: "MySQL", desc: "Structured hiring data" },
  { name: "PostgreSQL", desc: "Analytics-ready datasets" },
  { name: "MongoDB", desc: "Semi-structured documents" },
];

const DataConnect = () => {
  return (
    <div style={styles.page}>
      <h1>Connect Data Source</h1>
      <p>Convert data into structured analytics format</p>

      <div style={styles.grid}>
        {sources.map((s) => (
          <div key={s.name} style={styles.card}>
            <h3>{s.name}</h3>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DataConnect;

const styles: any = {
  page: {
    padding: "40px",
  },
  grid: {
    marginTop: "30px",
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "20px",
  },
  card: {
    border: "1px solid #000",
    padding: "24px",
  },
};
