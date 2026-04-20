const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },

  classRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
    required: true,
  },

  classTeacherRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher",
    required: true,
  },

  attendance: [
    {
      studentRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true,
      },
      status: {
        type: String,
        enum: ["P", "A"], // P = Present, A = Absent
        required: true,
      },
    },
  ],
}, {
  timestamps: true
});

const Attendance = mongoose.model("Attendance", attendanceSchema);
module.exports = Attendance;