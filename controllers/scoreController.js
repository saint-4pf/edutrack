// controllers/scoreController.js
const Score = require('../models/Score');

// ── CREATE ────────────────────────────────────
const createScore = async (req, res) => {
  try {
    const {
      studentId, studentName, className,
      subjectId, subjectName,
      sbaScore, examRaw,
      term, session, daysPresent,
      conduct, interest
    } = req.body;

    if (!studentId || !subjectId || sbaScore === undefined || examRaw === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide studentId, subjectId, sbaScore and examRaw.'
      });
    }
    if (sbaScore < 0 || sbaScore > 50) {
      return res.status(400).json({ success: false, message: 'SBA score must be 0–50.' });
    }
    if (examRaw < 0 || examRaw > 100) {
      return res.status(400).json({ success: false, message: 'Exam score must be 0–100.' });
    }

    const examScore = Math.round(examRaw / 2);
    const total     = Number(sbaScore) + examScore;

    const score = await Score.create({
      studentId, studentName, className,
      subjectId, subjectName,
      sbaScore, examRaw, examScore, total,
      term:        term       || '1st Term',
      session:     session    || '2024/2025',
      daysPresent: daysPresent || 0,
      conduct:     conduct    || '',
      interest:    interest   || '',
      teacherId:   req.user._id
    });

    res.status(201).json({
      success: true,
      message: `Score saved. SBA: ${sbaScore} + Exam: ${examScore} = ${total}/100`,
      data: score
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Score already exists for this student/subject/term. Use edit to update it.'
      });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ── GET ALL (with filters) ────────────────────
const getScores = async (req, res) => {
  try {
    const filter = { teacherId: req.user._id };
    if (req.query.className)  filter.className  = req.query.className;
    if (req.query.studentId)  filter.studentId  = req.query.studentId;
    if (req.query.subjectId)  filter.subjectId  = req.query.subjectId;
    if (req.query.term)       filter.term       = req.query.term;
    if (req.query.session)    filter.session    = req.query.session;

    const scores = await Score.find(filter).sort({ subjectName: 1 });
    res.status(200).json({ success: true, count: scores.length, data: scores });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ── GET ONE ───────────────────────────────────
const getScoreById = async (req, res) => {
  try {
    const score = await Score.findOne({ _id: req.params.id, teacherId: req.user._id });
    if (!score) return res.status(404).json({ success: false, message: 'Score not found.' });
    res.status(200).json({ success: true, data: score });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ── UPDATE ────────────────────────────────────
const updateScore = async (req, res) => {
  try {
    const { sbaScore, examRaw, daysPresent, conduct, interest } = req.body;
    const score = await Score.findOne({ _id: req.params.id, teacherId: req.user._id });
    if (!score) return res.status(404).json({ success: false, message: 'Score not found.' });

    if (sbaScore !== undefined) {
      if (sbaScore < 0 || sbaScore > 50)
        return res.status(400).json({ success: false, message: 'SBA must be 0–50.' });
      score.sbaScore = sbaScore;
    }
    if (examRaw !== undefined) {
      if (examRaw < 0 || examRaw > 100)
        return res.status(400).json({ success: false, message: 'Exam must be 0–100.' });
      score.examRaw   = examRaw;
      score.examScore = Math.round(examRaw / 2);
    }
    if (daysPresent !== undefined) score.daysPresent = daysPresent;
    if (conduct     !== undefined) score.conduct     = conduct;
    if (interest    !== undefined) score.interest    = interest;

    score.total = score.sbaScore + score.examScore;
    await score.save();

    res.status(200).json({
      success: true,
      message: `Score updated. New total: ${score.total}/100`,
      data: score
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ── DELETE ONE ────────────────────────────────
const deleteScore = async (req, res) => {
  try {
    const score = await Score.findOneAndDelete({ _id: req.params.id, teacherId: req.user._id });
    if (!score) return res.status(404).json({ success: false, message: 'Score not found.' });
    res.status(200).json({ success: true, message: 'Score deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ── DELETE ALL (admin only) ───────────────────
const deleteAllScores = async (req, res) => {
  try {
    await Score.deleteMany({});
    res.status(200).json({ success: true, message: 'All scores cleared.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  createScore, getScores, getScoreById,
  updateScore, deleteScore, deleteAllScores
};