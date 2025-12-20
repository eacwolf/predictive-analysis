import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "cadidatedb",
});

db.connect((err) => {
    if (err) {
        console.error("❌ MySQL connection error:", err.message);
    } else {
        console.log("✅ MySQL connected successfully");
    }
});

export default db;
