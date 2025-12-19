const express = require("express");
const cors = require("cors");
require("dotenv").config();
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

/* TEST ROUTE */
app.get("/", (req, res) => {
    res.send("Backend running successfully");
});

/* GET ALL CANDIDATES */
app.get("/api/candidates", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM cadidatedetails");
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database fetch failed" });
    }
});

/* ADD CANDIDATE */
app.post("/api/candidates", async (req, res) => {
    const { CNTname, CNDmobilenumber, CNDemail, CNDskills } = req.body;

    try {
        await db.query(
            "INSERT INTO cadidatedetails (CNTname, CNDmobilenumber, CNDemail, CNDskills) VALUES (?, ?, ?, ?)",
            [CNTname, CNDmobilenumber, CNDemail, CNDskills]
        );
        res.json({ message: "Candidate added" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Insert failed" });
    }
});

/* UPDATE CANDIDATE */
app.put("/api/candidates/:id", async (req, res) => {
    const { id } = req.params;
    const { CNTname, CNDmobilenumber, CNDemail, CNDskills } = req.body;

    try {
        await db.query(
            `UPDATE cadidatedetails 
       SET CNTname=?, CNDmobilenumber=?, CNDemail=?, CNDskills=? 
       WHERE id=?`,
            [CNTname, CNDmobilenumber, CNDemail, CNDskills, id]
        );
        res.json({ message: "Updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Update failed" });
    }
});

/* DELETE CANDIDATE */
app.delete("/api/candidates/:id", async (req, res) => {
    try {
        await db.query("DELETE FROM cadidatedetails WHERE id=?", [
            req.params.id,
        ]);
        res.json({ message: "Deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Delete failed" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
