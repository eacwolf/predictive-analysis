const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   GET all candidates
========================= */
app.get("/api/candidates", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM cadidatedetails");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* =========================
   UPDATE candidate
========================= */
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
        res.status(500).json({ error: err.message });
    }
});

/* =========================
   DELETE candidate
========================= */
app.delete("/api/candidates/:id", async (req, res) => {
    try {
        await db.query("DELETE FROM cadidatedetails WHERE id=?", [
            req.params.id,
        ]);
        res.json({ message: "Deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* =========================
   START SERVER
========================= */
app.listen(5000, () => {
    console.log("🚀 Backend running on http://localhost:5000");
});
