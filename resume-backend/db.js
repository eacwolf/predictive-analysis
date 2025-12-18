const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "YOUR_PASSWORD",
    database: "cadidatedb",
});

db.connect((err) => {
    if (err) {
        console.error("❌ MySQL Error:", err);
    } else {
        console.log("✅ MySQL Connected");
    }
});

module.exports = db;
