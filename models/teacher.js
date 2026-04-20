const mongoose = require("mongoose");

const TeacherSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CreateSchool",
    required: true
  },

  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    lowercase: true
  },

  phone: {
    type: String,
    required: true,
    trim: true
  },

  password: {
    type: String,
    required: true
  },

  className: {
    type: String,
    default: "None"   // this teacher is not class teacher yet
  },

  suspendedUntil: {
    type: Date,
    default: null
  },
  teacherID: {
    type: String,
    required: true,
    unique: true
  }

}, { timestamps: true });

// Virtual field → returns Active/Suspended
TeacherSchema.virtual("status").get(function () {
  if (!this.suspendedUntil) return "Active";
  return new Date() > this.suspendedUntil ? "Active" : "Suspended";
});

const Teacher=mongoose.model("Teacher", TeacherSchema);
module.exports = Teacher;

