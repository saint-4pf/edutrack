const TermSettings = require('../models/TermSettings');

const saveTermSettings = async (req, res) => {
  try {
    const { term, session, totalDays, termCloses, nextResumption } = req.body;
    const settings = await TermSettings.findOneAndUpdate(
      { term, session, teacherId: req.user._id },
      { totalDays, termCloses, nextResumption },
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTermSettings = async (req, res) => {
  try {
    const { term, session } = req.query;
    const settings = await TermSettings.findOne({
      term, session, teacherId: req.user._id
    });
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { saveTermSettings, getTermSettings };