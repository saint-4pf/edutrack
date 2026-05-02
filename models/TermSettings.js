// models/TermSettings.js
const mongoose = require('mongoose');

const termSettingsSchema = new mongoose.Schema(
  {
    term:          { type: String, required: true },
    session:       { type: String, required: true },
    totalDays:     { type: Number, required: true },
    termCloses:    { type: String },
    nextResumption:{ type: String },
    teacherId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

// One settings per term/session per teacher
termSettingsSchema.index(
  { term: 1, session: 1, teacherId: 1 },
  { unique: true }
);

module.exports = mongoose.model('TermSettings', termSettingsSchema);