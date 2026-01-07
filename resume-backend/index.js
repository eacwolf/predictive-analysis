import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import multer from "multer";
import XLSX from "xlsx";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "./db.js";

dotenv.config();

const app = express();

app.use(cors());
// Increase JSON / URL-encoded body parser limits to allow large Excel->JSON payloads
const BODY_LIMIT = process.env.BODY_LIMIT || "20mb";
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));

// Ensure uploads directory exists for file uploads
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer with a sensible upload size limit (defaults to 50MB)
const UPLOAD_MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES) || 50 * 1024 * 1024;
const upload = multer({ dest: uploadsDir, limits: { fileSize: UPLOAD_MAX_BYTES } });

/* ---------------- UPLOAD FILES ---------------- */
app.post("/api/upload", upload.array("files"), (req, res) => {
    try {
        const files = req.files || [];
        res.json({ uploaded: Array.isArray(files) ? files.length : 0 });
    } catch (err) {
        console.error("❌ Upload error:", err);
        res.status(500).json({ error: "Upload failed" });
    }
});

/* ---------------- UPLOAD + PARSE (server-side) ---------------- */
// Accept a single file, store it, parse the first sheet to count rows and return filename + rowCount
app.post("/api/upload-parse", upload.single("file"), (req, res) => {
    try {
        const f = req.file;
        if (!f) return res.status(400).json({ error: "No file uploaded" });

        const filepath = path.join(uploadsDir, f.filename);
        // Parse workbook and count rows
        const workbook = XLSX.readFile(filepath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: null });
        res.json({ ok: true, filename: f.filename, rowCount: json.length });
    } catch (err) {
        console.error("❌ Upload-parse error:", err);
        res.status(500).json({ error: "Upload parse failed" });
    }
});

/* ---------------- IMPORT FROM UPLOADED FILE (server-side, batch) ---------------- */
app.post("/api/import-file", authenticateToken, express.json(), async (req, res) => {
    const { filename } = req.body || {};
    if (!filename) return res.status(400).json({ error: "filename is required" });

    const filepath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filepath)) return res.status(404).json({ error: "file not found" });

    try {
        const workbook = XLSX.readFile(filepath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

        // reuse import mapping logic (similar to /api/import-excel)
        function findValue(obj, checks) {
            if (!obj || typeof obj !== "object") return null;
            const lmap = {};
            for (const k of Object.keys(obj)) {
                lmap[k.toLowerCase()] = obj[k];
            }
            for (const p of checks) {
                const pk = p.toLowerCase();
                if (pk in lmap) return lmap[pk];
                for (const lk of Object.keys(lmap)) {
                    if (lk.includes(pk)) return lmap[lk];
                }
            }
            return null;
        }

        const values = [];
        for (const r of rows) {
            if (!r || typeof r !== "object") continue;
            const cntname = findValue(r, ["cntname", "name", "candidate", "candidate_name", "full name", "fullname"]);
            const role = findValue(r, ["role", "designation", "position", "job"]);
            const email = findValue(r, ["cndemail", "email", "e-mail", "emailaddress", "email_address"]);
            const mobilenumber = findValue(r, ["cndmobilenumber", "mobile", "phone", "phonenumber", "contact", "mobilenumber"]);
            let skills = findValue(r, ["cndskills", "skill", "skills", "technologies"]);
            const yoeRaw = findValue(r, ["year_of_experience", "experience", "years", "yoe", "years_of_experience"]);
            const m1Raw = findValue(r, ["m1", "score1", "mark1", "marks1"]);
            const m2Raw = findValue(r, ["m2", "score2", "mark2", "marks2"]);
            const m3Raw = findValue(r, ["m3", "score3", "mark3", "marks3"]);
            const m4Raw = findValue(r, ["m4", "score4", "mark4", "marks4"]);

            const year_of_experience = yoeRaw == null || yoeRaw === "" ? 0 : parseFloat(String(yoeRaw)) || 0;
            const m1 = m1Raw == null || m1Raw === "" ? 0 : parseInt(String(m1Raw), 10) || 0;
            const m2 = m2Raw == null || m2Raw === "" ? 0 : parseInt(String(m2Raw), 10) || 0;
            const m3 = m3Raw == null || m3Raw === "" ? 0 : parseInt(String(m3Raw), 10) || 0;
            const m4 = m4Raw == null || m4Raw === "" ? 0 : parseInt(String(m4Raw), 10) || 0;

            if (skills == null) {
                skills = null;
            } else {
                if (Array.isArray(skills)) {
                    skills = skills.join(", ");
                } else if (typeof skills === "object") {
                    skills = JSON.stringify(skills);
                } else {
                    skills = String(skills);
                }
                const MAX_SKILLS_LEN = 2000;
                if (skills.length > MAX_SKILLS_LEN) skills = skills.slice(0, MAX_SKILLS_LEN);
            }

            values.push([
                cntname || null,
                role || null,
                email || null,
                mobilenumber || null,
                skills || null,
                year_of_experience,
                m1,
                m2,
                m3,
                m4,
            ]);
        }

        if (values.length === 0) return res.status(400).json({ error: "No valid rows to insert" });

        // Determine if the DB table has a `user_id` column. If not, fall back to inserting without it.
        const hasUserId = await new Promise((resolve) => {
            db.query("SHOW COLUMNS FROM cadidatedetails LIKE 'user_id'", (err, cols) => {
                if (err) return resolve(false);
                resolve(Array.isArray(cols) && cols.length > 0);
            });
        });

        // choose insert SQL based on whether user_id exists
        const insertSqlWithUser = `INSERT INTO cadidatedetails (CNTname, role, CNDemail, CNDmobilenumber, CNDskills, year_of_experience, m1, m2, m3, m4, user_id) VALUES ?`;
        const insertSqlNoUser = `INSERT INTO cadidatedetails (CNTname, role, CNDemail, CNDmobilenumber, CNDskills, year_of_experience, m1, m2, m3, m4) VALUES ?`;

        // batch insert to avoid huge single INSERT queries
        const BATCH = 200;
        let insertedTotal = 0;
        for (let i = 0; i < values.length; i += BATCH) {
            const slice = values.slice(i, i + BATCH);
            const chunk = hasUserId ? slice.map((r) => [...r, req.user ? req.user.id : null]) : slice;
            const sqlToUse = hasUserId ? insertSqlWithUser : insertSqlNoUser;
            // use promise wrapper
            await new Promise((resolve, reject) => {
                db.query(sqlToUse, [chunk], (err, result) => {
                    if (err) return reject(err);
                    insertedTotal += result && result.affectedRows ? result.affectedRows : chunk.length;
                    resolve(result);
                });
            });
        }

        // optional: remove uploaded file after processing
        try { fs.unlinkSync(filepath); } catch (e) { /* ignore */ }

        res.json({ ok: true, inserted: insertedTotal });
    } catch (err) {
        console.error("❌ Import-file error:", err);
        return res.status(500).json({ error: "Import file failed" });
    }
});

/* ---------------- UPDATE CANDIDATE ---------------- */
// Partial update for candidate fields (m1,m2,m3,m4, role, year_of_experience, etc.)
app.put('/api/candidate/:id', authenticateToken, async (req, res) => {
    const id = req.params.id;
    const allowed = ['m1','m2','m3','m4','role','year_of_experience','CNTname','CNDemail','CNDmobilenumber'];
    const updates = [];
    const params = [];

    for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(req.body, key)) {
            updates.push(`${key} = ?`);
            params.push(req.body[key]);
        }
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields provided to update' });
    }

    params.push(id);
    // detect whether user_id column exists; if so enforce ownership, otherwise update by id only
    const hasUserId = await new Promise((resolve) => {
        db.query("SHOW COLUMNS FROM cadidatedetails LIKE 'user_id'", (err, cols) => {
            if (err) return resolve(false);
            resolve(Array.isArray(cols) && cols.length > 0);
        });
    });

    let sql;
    if (hasUserId) {
        sql = `UPDATE cadidatedetails SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;
        params.push(req.user && req.user.id ? req.user.id : null);
    } else {
        sql = `UPDATE cadidatedetails SET ${updates.join(', ')} WHERE id = ?`;
    }

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error('❌ Candidate update error:', err);
            return res.status(500).json({ error: 'DB update error' });
        }
        res.json({ ok: true, affected: result.affectedRows });
    });
});

    /* ---------------- DELETE CANDIDATE ---------------- */
    app.delete('/api/candidate/:id', authenticateToken, async (req, res) => {
        const id = req.params.id;
        if (!id) return res.status(400).json({ error: 'id required' });
        console.log(`DELETE /api/candidate/${id} requested by:`, req.user || '(no user)');
        console.log('Authorization header:', req.headers && (req.headers.authorization || req.headers.Authorization));

        // detect whether user_id column exists; if so enforce ownership, otherwise delete by id only
        const hasUserId = await new Promise((resolve) => {
            db.query("SHOW COLUMNS FROM cadidatedetails LIKE 'user_id'", (err, cols) => {
                if (err) return resolve(false);
                resolve(Array.isArray(cols) && cols.length > 0);
            });
        });

        let sql;
        let params;
        if (hasUserId) {
            sql = 'DELETE FROM cadidatedetails WHERE id = ? AND user_id = ?';
            params = [id, req.user && req.user.id ? req.user.id : null];
        } else {
            sql = 'DELETE FROM cadidatedetails WHERE id = ?';
            params = [id];
        }

        db.query(sql, params, (err, result) => {
            if (err) {
                console.error('❌ Candidate delete error:', err);
                return res.status(500).json({ error: 'DB delete error' });
            }
            if (!result || !result.affectedRows) {
                return res.status(404).json({ error: 'Record not found' });
            }
            res.json({ ok: true, affected: result.affectedRows });
        });
    });

/* ---------------- HEALTH CHECK ---------------- */
app.get("/api/health", (req, res) => {
    res.json({ status: "Backend is up & healthy" });
});

/* ---------------- GET CADIDATES ---------------- */
app.get("/api/cadidates", authenticateToken, async (req, res) => {
    // detect whether user_id column exists; if so return only that user's rows, otherwise return all rows
    const uid = req.user ? req.user.id : null;
    const hasUserId = await new Promise((resolve) => {
        db.query("SHOW COLUMNS FROM cadidatedetails LIKE 'user_id'", (err, cols) => {
            if (err) return resolve(false);
            resolve(Array.isArray(cols) && cols.length > 0);
        });
    });

    const sql = hasUserId ? "SELECT * FROM cadidatedetails WHERE user_id = ?" : "SELECT * FROM cadidatedetails";
    const params = hasUserId ? [uid] : [];

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("❌ DB fetch error:", err);
            return res.status(500).json({ error: "DB fetch error" });
        }
        // Normalize database column names to a stable API shape expected by frontend
        const normalized = results.map((c) => ({
            id: c.id,
            name: c.CNTname || c.CNName || c.name || "",
            role: c.role || "",
            experience: Number(c.year_of_experience ?? c.experience ?? 0),
            email: c.CNDemail || c.CNEmail || c.email || "",
            mobile: c.CNDmobilenumber || c.CNMobileNumber || c.mobile || "",
            m1: Number(c.m1 ?? 0),
            m2: Number(c.m2 ?? 0),
            m3: Number(c.m3 ?? 0),
            m4: Number(c.m4 ?? 0),
        }));

        res.json(normalized);
    });
});

/* ---------------- INIT DB ---------------- */
app.post("/api/init-db", (req, res) => {
    const createSql = `
    CREATE TABLE IF NOT EXISTS cadidatedetails (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        CNTname VARCHAR(255),
        role VARCHAR(100),
        CNDemail VARCHAR(255),
        CNDmobilenumber VARCHAR(50),
        CNDskills VARCHAR(255),
        year_of_experience DOUBLE DEFAULT 0,
        m1 INT DEFAULT 0,
        m2 INT DEFAULT 0,
        m3 INT DEFAULT 0,
        m4 INT DEFAULT 0,
        user_id INT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    db.query(createSql, (err) => {
        if (err) {
            console.error("❌ Init DB error:", err);
            return res.status(500).json({ error: "Init DB failed" });
        }
        res.json({ ok: true, message: "Table ensured" });
    });
});

/* ---------------- IMPORT EXCEL (JSON) ---------------- */
app.post("/api/import-excel", authenticateToken, async (req, res) => {
    const rows = req.body;
    if (!Array.isArray(rows)) {
        return res.status(400).json({ error: "Expected an array of objects in request body" });
    }

    function findValue(obj, checks) {
        if (!obj || typeof obj !== "object") return null;
        const lmap = {};
        for (const k of Object.keys(obj)) {
            lmap[k.toLowerCase()] = obj[k];
        }
        for (const p of checks) {
            const pk = p.toLowerCase();
            if (pk in lmap) return lmap[pk];
            for (const lk of Object.keys(lmap)) {
                if (lk.includes(pk)) return lmap[lk];
            }
        }
        return null;
    }

    const values = [];
    for (const r of rows) {
        if (!r || typeof r !== "object") continue;
        const cntname = findValue(r, ["cntname", "name", "candidate", "candidate_name", "full name", "fullname"]);
        const role = findValue(r, ["role", "designation", "position", "job"]);
        const email = findValue(r, ["cndemail", "email", "e-mail", "emailaddress", "email_address"]);
        const mobilenumber = findValue(r, ["cndmobilenumber", "mobile", "phone", "phonenumber", "contact", "mobilenumber"]);
        let skills = findValue(r, ["cndskills", "skill", "skills", "technologies"]);
        const yoeRaw = findValue(r, ["year_of_experience", "experience", "years", "yoe", "years_of_experience"]);
        const m1Raw = findValue(r, ["m1", "score1", "mark1", "marks1"]);
        const m2Raw = findValue(r, ["m2", "score2", "mark2", "marks2"]);
        const m3Raw = findValue(r, ["m3", "score3", "mark3", "marks3"]);
        const m4Raw = findValue(r, ["m4", "score4", "mark4", "marks4"]);

        const year_of_experience = yoeRaw == null || yoeRaw === "" ? 0 : parseFloat(String(yoeRaw)) || 0;
        const m1 = m1Raw == null || m1Raw === "" ? 0 : parseInt(String(m1Raw), 10) || 0;
        const m2 = m2Raw == null || m2Raw === "" ? 0 : parseInt(String(m2Raw), 10) || 0;
        const m3 = m3Raw == null || m3Raw === "" ? 0 : parseInt(String(m3Raw), 10) || 0;
        const m4 = m4Raw == null || m4Raw === "" ? 0 : parseInt(String(m4Raw), 10) || 0;
        // Normalize skills to string and truncate to avoid DB column overflow
        if (skills == null) {
            skills = null;
        } else {
            // Coerce arrays/objects to comma-joined string
            if (Array.isArray(skills)) {
                skills = skills.join(", ");
            } else if (typeof skills === "object") {
                skills = JSON.stringify(skills);
            } else {
                skills = String(skills);
            }

            const MAX_SKILLS_LEN = 1000; // safe default; consider ALTER TABLE to TEXT for larger storage
            if (skills.length > MAX_SKILLS_LEN) {
                console.warn(`⚠️ Truncating skills from ${skills.length} to ${MAX_SKILLS_LEN} characters`);
                skills = skills.slice(0, MAX_SKILLS_LEN);
            }
        }

        values.push([
            cntname || null,
            role || null,
            email || null,
            mobilenumber || null,
            skills || null,
            year_of_experience,
            m1,
            m2,
            m3,
            m4,
        ]);
    }

    if (values.length === 0) {
        return res.status(400).json({ error: "No valid rows to insert" });
    }

    // Determine whether the table has a user_id column and choose insert accordingly
    const hasUserId = await new Promise((resolve) => {
        db.query("SHOW COLUMNS FROM cadidatedetails LIKE 'user_id'", (err, cols) => {
            if (err) return resolve(false);
            resolve(Array.isArray(cols) && cols.length > 0);
        });
    });

    const insertSqlWithUser = `INSERT INTO cadidatedetails (CNTname, role, CNDemail, CNDmobilenumber, CNDskills, year_of_experience, m1, m2, m3, m4, user_id) VALUES ?`;
    const insertSqlNoUser = `INSERT INTO cadidatedetails (CNTname, role, CNDemail, CNDmobilenumber, CNDskills, year_of_experience, m1, m2, m3, m4) VALUES ?`;

    const uid = req.user ? req.user.id : null;
    const rowsToInsert = hasUserId ? values.map((v) => [...v, uid]) : values;

    db.query(hasUserId ? insertSqlWithUser : insertSqlNoUser, [rowsToInsert], (err, result) => {
        if (err) {
            console.error("❌ DB insert error:", err);
            return res.status(500).json({ error: "DB insert error" });
        }
        const inserted = result && result.affectedRows ? result.affectedRows : values.length;
        res.json({ ok: true, inserted });
    });
});

/* ---------------- SERVER ---------------- */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Backend running at http://localhost:${PORT}`);
});

/* ---------------- AUTH: ensure users table and endpoints ---------------- */
const USERS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    salt VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

db.query(USERS_TABLE_SQL, (err) => {
    if (err) console.error("❌ Ensure users table error:", err);
});

const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret";

function signToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
}

app.post("/api/signup", express.json(), (req, res) => {
    const { name, email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password required" });

    db.query("SELECT id FROM users WHERE email = ?", [email], async (err, results) => {
        if (err) {
            console.error("❌ Signup lookup error:", err);
            return res.status(500).json({ error: "DB error" });
        }
        if (results && results.length > 0) return res.status(409).json({ error: "User already exists" });

        try {
            const password_hash = await bcrypt.hash(password, 10);
            const salt = "";
            db.query("INSERT INTO users (name, email, password_hash, salt) VALUES (?, ?, ?, ?)", [name || null, email, password_hash, salt], (err2, result) => {
                if (err2) {
                    console.error("❌ Signup insert error:", err2);
                    return res.status(500).json({ error: "DB insert error" });
                }
                const id = result.insertId;
                const token = signToken({ id, email });
                res.json({ ok: true, user: { id, name, email }, token });
            });
        } catch (e) {
            console.error("❌ Signup hash error:", e);
            return res.status(500).json({ error: "Hashing error" });
        }
    });
});

app.post("/api/login", express.json(), (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password required" });

    db.query("SELECT id, name, email, password_hash FROM users WHERE email = ?", [email], async (err, results) => {
        if (err) {
            console.error("❌ Login lookup error:", err);
            return res.status(500).json({ error: "DB error" });
        }
        if (!results || results.length === 0) return res.status(401).json({ error: "Invalid credentials" });

        const user = results[0];
        try {
            const ok = await bcrypt.compare(password, user.password_hash);
            if (!ok) return res.status(401).json({ error: "Invalid credentials" });
            const token = signToken({ id: user.id, email: user.email });
            res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email }, token });
        } catch (e) {
            console.error("❌ Login compare error:", e);
            return res.status(500).json({ error: "Auth error" });
        }
    });
});

app.post("/api/forgot-password", express.json(), (req, res) => {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "email required" });
    // generate a temporary password (simple alphanumeric) — consider stronger generator in production
    const newPassword = Math.random().toString(36).slice(-10);
    db.query("SELECT id FROM users WHERE email = ?", [email], async (err, results) => {
        if (err) return res.status(500).json({ error: "DB error" });
        if (!results || results.length === 0) return res.status(404).json({ error: "Email not found" });
        const user = results[0];
        try {
            const password_hash = await bcrypt.hash(newPassword, 10);
            db.query("UPDATE users SET password_hash = ? WHERE id = ?", [password_hash, user.id], (err2) => {
                if (err2) return res.status(500).json({ error: "DB error updating password" });
                // Return the new password in a structured field so the frontend can show/copy it.
                res.json({ ok: true, password: newPassword, message: `Password reset` });
            });
        } catch (e) {
            return res.status(500).json({ error: "Hashing error" });
        }
    });
});

/* Authentication middleware */
function authenticateToken(req, res, next) {
    const authHeader = req.headers && (req.headers.authorization || req.headers.Authorization);
    const token = authHeader && String(authHeader).startsWith("Bearer ") ? String(authHeader).slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch (e) {
        return res.status(401).json({ error: "Invalid token" });
    }
}
