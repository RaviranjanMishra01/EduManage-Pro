const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    subjectName: {
      type: String,
      required: true,
      trim: true,
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true
    },

    subjectTeachers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Teacher",
      }
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true
    }
  },
  { timestamps: true }
);

const Subject = mongoose.model("Subject", subjectSchema);

module.exports = Subject;
