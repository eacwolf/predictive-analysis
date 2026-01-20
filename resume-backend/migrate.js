import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "cadidatedb",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

const queries = [
    "ALTER TABLE cadidatedetails ADD COLUMN m1 INT DEFAULT 0",
    "ALTER TABLE cadidatedetails ADD COLUMN m2 INT DEFAULT 0",
    "ALTER TABLE cadidatedetails ADD COLUMN m3 INT DEFAULT 0",
    "ALTER TABLE cadidatedetails ADD COLUMN m4 INT DEFAULT 0",
    "ALTER TABLE cadidatedetails ADD COLUMN m5 INT DEFAULT 0",
];

async function runMigrations() {
    for (const query of queries) {
        try {
            await new Promise((resolve, reject) => {
                pool.query(query, (err, result) => {
                    if (err) {
                        // Ignore "Duplicate column" errors if columns already exist
                        if (err.code === 'ER_DUP_FIELDNAME') {
                            console.log(`⏭️  Skipping: Column already exists`);
                            resolve(result);
                        } else {
                            reject(err);
                        }
                    } else {
                        console.log(`✅ Executed: ${query}`);
                        resolve(result);
                    }
                });
            });
        } catch (err) {
            console.error(`❌ Error: ${err.message}`);
        }
    }
    pool.end(() => {
        console.log('\n✅ Migration complete');
        process.exit(0);
    });
}

runMigrations();
