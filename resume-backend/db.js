import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "cadidatedb",
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONN_LIMIT) || 10,
    queueLimit: 0,
});

// Verify a connection at startup and log detailed errors
pool.getConnection((err, connection) => {
    if (err) {
        console.error("❌ MySQL pool connection error:", err);
    } else {
        console.log("✅ MySQL pool connected successfully");
        connection.release();
    }
});

export default pool;
