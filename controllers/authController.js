const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User   = require('../models/User');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, className } = req.body;

    if (!firstName || !lastName || !email || !password || !className) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields.'
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    // Hash password here in the controller
    const salt           = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.create({
      firstName, lastName, email,
      password: hashedPassword,
      className
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please sign in.'
    });

  } catch (error) {
    res.status(500).json({
      success: false, message: 'Server error', error: error.message
    });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false, message: 'Please provide email and password.'
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false, message: 'Invalid email or password.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false, message: 'Invalid email or password.'
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id:        user._id,
        firstName: user.firstName,
        lastName:  user.lastName,
        email:     user.email,
        className: user.className,
        role:      user.role
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false, message: 'Server error', error: error.message
    });
  }
};

// POST /api/auth/admin-login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false, isAdmin: false,
        message: 'Access denied. Not an admin account.'
      });
    }

    res.status(200).json({
      success: true, isAdmin: true,
      message: 'Admin authentication successful'
    });

  } catch (error) {
    res.status(500).json({
      success: false, message: 'Server error', error: error.message
    });
  }
};

// GET /api/auth/teachers
const getTeachers = async (req, res) => {
  try {
    const teachers = await User.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true, count: teachers.length, data: teachers
    });
  } catch (error) {
    res.status(500).json({
      success: false, message: 'Server error', error: error.message
    });
  }
};

// DELETE /api/auth/users/:id
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (user.role === 'admin') {
      return res.status(400).json({
        success: false, message: 'Cannot delete admin account.'
      });
    }
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Teacher account removed.' });
  } catch (error) {
    res.status(500).json({
      success: false, message: 'Server error', error: error.message
    });
  }
};

module.exports = { register, login, adminLogin, getTeachers, deleteUser };