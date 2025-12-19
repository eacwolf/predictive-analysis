require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

/* ===============================
   GET ALL CADIDATES
================================ */
app.get("/api/cadidates", async (req, res) => {
    try {
        const [rows] = await db.promise().query(
            `SELECT 
        id,
        CNTname,
        role,
        CNDmobilenumber,
        CNDemail,
        CNDskills
       FROM cadidatedetails`
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "DB fetch error" });
    }
});

/* ===============================
   ADD CADIDATE
================================ */
app.post("/api/cadidates", async (req, res) => {
    const { CNTname, role, CNDmobilenumber, CNDemail, CNDskills } = req.body;

    try {
        const [result] = await db.promise().query(
            `INSERT INTO cadidatedetails
       (CNTname, role, CNDmobilenumber, CNDemail, CNDskills)
       VALUES (?, ?, ?, ?, ?)`,
            [CNTname, role, CNDmobilenumber, CNDemail, CNDskills]
        );

        res.json({ id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Insert failed" });
    }
});

/* ===============================
   UPDATE CADIDATE
================================ */
app.put("/api/cadidates/:id", async (req, res) => {
    const { id } = req.params;
    const { CNTname, role, CNDmobilenumber, CNDemail, CNDskills } = req.body;

    try {
        await db.promise().query(
            `UPDATE cadidatedetails
       SET CNTname=?, role=?, CNDmobilenumber=?, CNDemail=?, CNDskills=?
       WHERE id=?`,
            [CNTname, role, CNDmobilenumber, CNDemail, CNDskills, id]
        );

        res.json({ message: "Updated" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Update failed" });
    }
});

/* ===============================
   DELETE CADIDATE
================================ */
app.delete("/api/cadidates/:id", async (req, res) => {
    try {
        await db.promise().query(
            "DELETE FROM cadidatedetails WHERE id=?",
            [req.params.id]
        );

        res.json({ message: "Deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Delete failed" });
    }
});

/* ===============================
   SERVER
================================ */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
    console.log(`🚀 Backend running on http://localhost:${PORT}`)
);
