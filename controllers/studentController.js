// controllers/studentController.js
// ─────────────────────────────────────────────
// Updated: all queries now filter by teacherId
// so each teacher only sees their own students.
// ─────────────────────────────────────────────

const Student = require('../models/Student');
const Score   = require('../models/Score');

// ── CREATE ────────────────────────────────────
const createStudent = async (req, res) => {
  try {
    const { name, studentId, className } = req.body;
    if (!name || !studentId || !className) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, studentId, and className.'
      });
    }
    const student = await Student.create({
      name, studentId, className,
      teacherId: req.user._id   // link to this teacher
    });
    res.status(201).json({ success: true, message: 'Student created successfully.', data: student });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A student with this ID already exists.' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ── GET ALL ───────────────────────────────────
const getAllStudents = async (req, res) => {
  try {
    const students = await Student
      .find({ teacherId: req.user._id })
      .sort({ name: 1 });
    res.status(200).json({ success: true, count: students.length, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ── GET ONE ───────────────────────────────────
const getStudentById = async (req, res) => {
  try {
    const student = await Student.findOne({
      _id: req.params.id,
      teacherId: req.user._id
    });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    res.status(200).json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ── UPDATE ────────────────────────────────────
const updateStudent = async (req, res) => {
  try {
    const { name, studentId, className } = req.body;
    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, teacherId: req.user._id },
      { name, studentId, className },
      { new: true, runValidators: true }
    );
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    res.status(200).json({ success: true, message: 'Student updated successfully.', data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ── DELETE ONE ────────────────────────────────
const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findOneAndDelete({
      _id: req.params.id,
      teacherId: req.user._id
    });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    // Also delete all scores for this student
    await Score.deleteMany({ studentId: req.params.id });
    res.status(200).json({ success: true, message: 'Student and their scores deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ── DELETE ALL (admin only) ───────────────────
const deleteAllStudents = async (req, res) => {
  try {
    await Student.deleteMany({});
    await Score.deleteMany({});
    res.status(200).json({ success: true, message: 'All students and scores cleared.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  createStudent, getAllStudents, getStudentById,
  updateStudent, deleteStudent, deleteAllStudents
};