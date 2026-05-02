// models/Student.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    studentId: {
      type: String,
      required: [true, 'Student ID is required'],
      trim: true,
      uppercase: true
    },
    className: {
      type: String,
      required: [true, 'Class name is required'],
      trim: true
    },
    // Each student belongs to a teacher
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// Unique studentId per teacher (not globally)
studentSchema.index({ studentId: 1, teacherId: 1 }, { unique: true });

const Student = mongoose.model('Student', studentSchema);
module.exports = Student;