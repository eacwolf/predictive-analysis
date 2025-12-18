import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./db.js";

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

/**
 * ✅ FETCH CANDIDATES (NO RENAMING)
 * Column names EXACTLY match MySQL
 */
app.get("/api/candidates", async (req, res) => {
    try {
        const [rows] = await db.query(`
      SELECT 
        CNTname,
        CNDmobilenumber,
        CNDemail,
        CNDskills,
        id
      FROM cadidatedetails
    `);

        res.json(rows);
    } catch (err) {
        console.error("❌ Fetch error:", err);
        res.status(500).json({ error: "Database fetch failed" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
