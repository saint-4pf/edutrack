// controllers/importController.js
// ─────────────────────────────────────────────
// Handles bulk student import from a CSV file.
// Expected CSV columns (first row = headers):
//   name, studentId, className
//
// Example CSV:
//   name,studentId,className
//   Kofi Mensah,STU-001,JSS 3A
//   Ama Owusu,STU-002,JSS 3A
// ─────────────────────────────────────────────

const Student = require('../models/Student');

// POST /api/import/students
// Body: { csvText: "name,studentId,className\n..." }
const importStudentsCSV = async (req, res) => {
  try {
    const { csvText } = req.body;

    if (!csvText || !csvText.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide CSV data in the request body.'
      });
    }

    const lines = csvText.trim().split('\n').map(l => l.trim()).filter(Boolean);

    if (lines.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'CSV must have a header row and at least one data row.'
      });
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIdx      = headers.indexOf('name');
    const studentIdIdx = headers.indexOf('studentid');
    const classIdx     = headers.indexOf('classname');

    if (nameIdx === -1 || studentIdIdx === -1 || classIdx === -1) {
      return res.status(400).json({
        success: false,
        message: 'CSV headers must include: name, studentId, className'
      });
    }

    const results = {
      imported: [],
      skipped:  [],
      errors:   []
    };

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      const name      = cols[nameIdx];
      const studentId = cols[studentIdIdx];
      const className = cols[classIdx];

      // Skip empty rows
      if (!name && !studentId && !className) continue;

      // Validate row
      if (!name || !studentId || !className) {
        results.errors.push({
          row: i + 1,
          data: lines[i],
          reason: 'Missing name, studentId or className'
        });
        continue;
      }

      try {
        await Student.create({
          name,
          studentId: studentId.toUpperCase(),
          className,
          teacherId: req.user._id
        });
        results.imported.push({ name, studentId, className });
      } catch (err) {
        if (err.code === 11000) {
          results.skipped.push({
            row: i + 1,
            studentId,
            reason: 'Student ID already exists'
          });
        } else {
          results.errors.push({
            row: i + 1,
            studentId,
            reason: err.message
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Import complete. ${results.imported.length} imported, ${results.skipped.length} skipped, ${results.errors.length} errors.`,
      summary: {
        total:    lines.length - 1,
        imported: results.imported.length,
        skipped:  results.skipped.length,
        errors:   results.errors.length
      },
      details: results
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { importStudentsCSV };