// models/Score.js
const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema(
  {
    studentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    studentName: { type: String, required: true, trim: true },
    className:   { type: String, required: true, trim: true },
    subjectId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    subjectName: { type: String, required: true, trim: true },

    // Scoring: SBA max 50, examRaw max 100, examScore = examRaw/2, total = sba + examScore
    sbaScore:  { type: Number, required: true, min: 0, max: 50 },
    examRaw:   { type: Number, required: true, min: 0, max: 100 },
    examScore: { type: Number, required: true },
    total:     { type: Number, required: true },

    // Term isolation — scores are separated per term/session
    term:    { type: String, default: '1st Term' },
    session: { type: String, default: '2024/2025' },

    // Per-student attendance for this term
    daysPresent: { type: Number, default: 0, min: 0 },
    conduct:     {type: String, default: ''},
    interest:    {type: String, default: ''},

    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

// Unique score per student per subject per teacher per term per session
scoreSchema.index(
  { studentId: 1, subjectId: 1, teacherId: 1, term: 1, session: 1 },
  { unique: true }
);

const Score = mongoose.model('Score', scoreSchema);
module.exports = Score;