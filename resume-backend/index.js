const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

/* GET */
app.get("/api/candidates", (req, res) => {
    db.query("SELECT * FROM cadidatedetails", (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
    });
});

/* ADD */
app.post("/api/candidates", (req, res) => {
    const { CNTname, CNDmobilenumber, CNDemail, CNDskills } = req.body;

    const sql = `
    INSERT INTO cadidatedetails
    (CNTname, CNDmobilenumber, CNDemail, CNDskills)
    VALUES (?, ?, ?, ?)
  `;

    db.query(sql, [CNTname, CNDmobilenumber, CNDemail, CNDskills], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ id: result.insertId });
    });
});

/* UPDATE */
app.put("/api/candidates/:id", (req, res) => {
    const { CNTname, CNDmobilenumber, CNDemail, CNDskills } = req.body;

    const sql = `
    UPDATE cadidatedetails
    SET CNTname=?, CNDmobilenumber=?, CNDemail=?, CNDskills=?
    WHERE id=?
  `;

    db.query(
        sql,
        [CNTname, CNDmobilenumber, CNDemail, CNDskills, req.params.id],
        (err, result) => {
            if (err) return res.status(500).json(err);
            res.json({ updated: result.affectedRows });
        }
    );
});

app.listen(5000, () =>
    console.log("🚀 Backend running on http://localhost:5000")
);
