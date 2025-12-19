const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

/* DB CONNECTION */
const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "cadidatedb",
});

/* CONNECT */
db.connect((err) => {
    if (err) {
        console.error("❌ MySQL Error:", err);
        return;
    }
    console.log("✅ MySQL Connected");
});

/* GET ALL */
app.get("/api/candidates", async (req, res) => {
    const [rows] = await db.promise().query(
        "SELECT * FROM cadidatedetails"
    );
    res.json(rows);
});

/* ADD NEW */
app.post("/api/candidates", async (req, res) => {
    const { CNTname, CNDmobilenumber, CNDemail, CNDskills } = req.body;

    const [result] = await db.promise().query(
        `INSERT INTO cadidatedetails 
     (CNTname, CNDmobilenumber, CNDemail, CNDskills)
     VALUES (?, ?, ?, ?)`,
        [CNTname, CNDmobilenumber, CNDemail, CNDskills]
    );

    const [rows] = await db.promise().query(
        "SELECT * FROM cadidatedetails WHERE id = ?",
        [result.insertId]
    );

    res.json(rows[0]);
});

/* UPDATE */
app.put("/api/candidates/:id", async (req, res) => {
    const { id } = req.params;
    const { CNTname, CNDmobilenumber, CNDemail, CNDskills } = req.body;

    await db.promise().query(
        `UPDATE cadidatedetails
     SET CNTname=?, CNDmobilenumber=?, CNDemail=?, CNDskills=?
     WHERE id=?`,
        [CNTname, CNDmobilenumber, CNDemail, CNDskills, id]
    );

    res.json({ success: true });
});

/* DELETE */
app.delete("/api/candidates/:id", async (req, res) => {
    await db.promise().query(
        "DELETE FROM cadidatedetails WHERE id = ?",
        [req.params.id]
    );
    res.json({ success: true });
});

/* START */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
    console.log(`🚀 Backend running on http://localhost:${PORT}`)
);
