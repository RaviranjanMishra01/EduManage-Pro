const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    className: {
      type: String,
      unique: true,
      required: [true, "Class name is required"],
      trim: true,
    },

    classTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",   // Make sure Teacher model exists
      default: null,
      required: true,
    },

    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",  // Your CreateSchool model name
      required: [true, "School reference is required"],
    },

    maxStudents: {
      type: Number,
      default: 40,
      min: [1, "Minimum students should be 1"]
    },

    studentCount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "ARCHIVED"],
      default: "ACTIVE",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School", // or Admin model if you have one
    }, 
     subjects: {      
      type: [String],      
      default: ["Hindi", "Mathematics", "Science", "History", "Games"]
     }
  },
  { timestamps: true }
);

const Class = mongoose.model("Class", classSchema);

module.exports = Class;