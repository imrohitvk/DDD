const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Serve the raw CSV file so frontend can parse it client-side
router.get('/tableau', (req, res) => {
  try {
    // CSV is located one level above backend (workspace root)
    const csvPath = path.resolve(process.cwd(), '..', 'Tableau.csv');
    fs.readFile(csvPath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading CSV:', err);
        return res.status(500).json({ error: 'Could not read CSV file', message: err.message });
      }
      res.type('text/csv').send(data);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', message: err.message });
  }
});

module.exports = router;
