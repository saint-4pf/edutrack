// controllers/subjectController.js
// ─────────────────────────────────────────────
// All subject operations.
// Every query filters by req.user._id so teachers
// only ever see and manage THEIR OWN subjects.
// ─────────────────────────────────────────────

const Subject = require('../models/Subject');

// ── CREATE subject ────────────────────────────
// POST /api/subjects
const createSubject = async (req, res) => {
  try {
    const { name, code } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Subject name is required.' });
    }

    // teacherId comes from req.user (set by the protect middleware)
    const subject = await Subject.create({
      name,
      code: code || '',
      teacherId: req.user._id
    });

    res.status(201).json({
      success: true,
      message: `Subject "${name}" created successfully.`,
      data: subject
    });

  } catch (error) {
    // Duplicate name for the same teacher
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You already have a subject with this name.'
      });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ── GET all subjects for this teacher ─────────
// GET /api/subjects
const getSubjects = async (req, res) => {
  try {
    const subjects = await Subject
      .find({ teacherId: req.user._id })
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: subjects.length,
      data: subjects
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ── UPDATE subject ────────────────────────────
// PUT /api/subjects/:id
const updateSubject = async (req, res) => {
  try {
    const { name, code } = req.body;

    // Make sure the subject belongs to this teacher
    const subject = await Subject.findOne({
      _id: req.params.id,
      teacherId: req.user._id
    });

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    subject.name = name || subject.name;
    subject.code = code !== undefined ? code : subject.code;
    await subject.save();

    res.status(200).json({
      success: true,
      message: 'Subject updated successfully.',
      data: subject
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You already have a subject with this name.'
      });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ── DELETE subject ────────────────────────────
// DELETE /api/subjects/:id
const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findOne({
      _id: req.params.id,
      teacherId: req.user._id
    });

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    await Subject.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Subject deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { createSubject, getSubjects, updateSubject, deleteSubject };