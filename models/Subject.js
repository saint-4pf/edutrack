// models/Subject.js
// ─────────────────────────────────────────────
// A subject belongs to a specific teacher (user).
// The combination of name + teacherId must be unique —
// meaning the same teacher can't have two subjects
// with the same name, but two different teachers can
// each have "Mathematics".
// ─────────────────────────────────────────────

const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
      maxlength: [100, 'Subject name cannot exceed 100 characters']
    },
    // Short code for compact display e.g. "MATH", "ENG"
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: ''
    },
    // Which teacher owns this subject
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// ── UNIQUE CONSTRAINT ────────────────────────
// A teacher cannot have two subjects with the same name.
// This compound index enforces that at the database level.
subjectSchema.index({ name: 1, teacherId: 1 }, { unique: true });

const Subject = mongoose.model('Subject', subjectSchema);
module.exports = Subject;