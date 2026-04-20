const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      default: "CMSDEFP",  // Default password
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED"],
      default: "ACTIVE",
    },

    suspendedUntil: {
      type: Date,
      default: null,
    }
  },
  { timestamps: true }
);

/* -------- Virtual field for Remaining Days -------- */
studentSchema.virtual("remainingDays").get(function () {
  if (!this.suspendedUntil) return 0;

  const now = new Date();
  const diff = this.suspendedUntil - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  return days > 0 ? days : 0;
});

/* -------- Auto update status on fetch -------- */
studentSchema.pre("find", function () {
  this.populate("classId school");
});

studentSchema.post("find", function (docs) {
  docs.forEach(s => {
    if (s.suspendedUntil && s.suspendedUntil < new Date()) {
      s.status = "ACTIVE";
    }
  });
});

const Student = mongoose.model("Student", studentSchema);
module.exports = Student;
