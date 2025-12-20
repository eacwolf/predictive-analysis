import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./db.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

/* ---------------- HEALTH CHECK ---------------- */
app.get("/api/health", (req, res) => {
    res.json({ status: "Backend is up & healthy" });
});

/* ---------------- GET CADIDATES ---------------- */
app.get("/api/cadidates", (req, res) => {
    const sql = "SELECT * FROM cadidatedetails";

    db.query(sql, (err, results) => {
        if (err) {
            console.error("❌ DB fetch error:", err.message);
            return res.status(500).json({ error: "DB fetch error" });
        }
        res.json(results);
    });
});

/* ---------------- SERVER ---------------- */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Backend running at http://localhost:${PORT}`);
});
