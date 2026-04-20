const express = require("express");
const handelTeacher = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Teacher = require("../models/teacher.js"); // Adjust path if needed
const Class = require("../models/class.js");
const sendEmail = require("../mail/emails"); // Your email function
const { teacherAuth, redirectIfTeacherAuthenticated } = require("../middleware/teacherAuth");
const sendVerificationEmail = require("../mail/emails");
const Subject = require("../models/subject.js");
const Student = require("../models/student.js");
const Attendance = require("../models/attendance.js");
const { mongo } = require("mongoose");
const { default: mongoose } = require("mongoose");



handelTeacher.get("/login", redirectIfTeacherAuthenticated, (req, res) => {
  res.render("teachers/login" ,{ message: null });
});



// Teacher Login POST with JWT
handelTeacher.post("/login", async (req, res) => {
  const { identifier, password } = req.body;

  try {
    // Find teacher by email or teacherID
    const teacher = await Teacher.findOne({
      $or: [{ email: identifier }, { teacherID: identifier }]
    });

    if (!teacher) {
      return res.render("teachers/login", { message: "Invalid email/ID or password!" });
    }

    // Compare passwords
    const match = await bcrypt.compare(password, teacher.password);
    if (!match) {
      return res.render("teachers/login", { message: "Invalid email/ID or password!" });
    }

    // Generate JWT
    const payload = {
      id: teacher._id,
      name: teacher.name,
      teacherID: teacher.teacherID,
      schoolId: teacher.schoolId
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

    // Set JWT as cookie
    res.cookie("TeacherToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // only HTTPS in prod
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Redirect to dashboard
    res.redirect("/teacher/dashboard");
  } catch (err) {
    console.error(err);
    res.render("teachers/login", { message: "Something went wrong!" });
  }
});

handelTeacher.get("/dashboard", teacherAuth, async (req, res) => {
  try {
    const teacher = req.teacher;
    const teacherId = teacher.id;

    // 1. Classes where teacher is class teacher
    const classTeacherOf = await Class.find({ classTeacher: teacherId })
      .select("_id className")
      .lean();

    // 2. Classes where teacher teaches subjects
    const subjectsTaught = await Subject.find({ subjectTeachers: teacherId })
      .select("classId")
      .populate("classId", "className")
      .lean();

    const subjectClasses = subjectsTaught.map(s => ({
      _id: s.classId._id.toString(),
      className: s.classId.className,
    }));

    // Merge unique classes
    const classMap = new Map();
    [...classTeacherOf, ...subjectClasses].forEach(c => {
      classMap.set(c._id.toString(), { _id: c._id, className: c.className || `Class ${c._id}` });
    });

    const assignedClasses = Array.from(classMap.values());
    const classIds = assignedClasses.map(c => c._id);

    if (classIds.length === 0) {
      return res.render("teachers/teacherDashboard", {
        teacher,
        classTeacherOf: [],
        assignedClasses: [],
        students: [],
        subjectsOfClasses: [],
        todayTakenForClasses: [],
        todayAttendanceSummary: { present: 0, total: 0, percentage: 0 },
        monthlyAttendanceRate: 0
      });
    }

    // 3. Students in assigned classes
    const students = await Student.find({ classId: { $in: classIds } })
      .select("name email classId suspendedUntil")
      .lean();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const formattedStudents = students.map(s => ({
      ...s,
      _id: s._id.toString(),
      remainingDays: s.suspendedUntil && s.suspendedUntil > today
        ? Math.ceil((new Date(s.suspendedUntil) - today) / (1000 * 60 * 60 * 24))
        : 0
    }));

    // 4. Subjects of assigned classes
    const subjectsOfClasses = await Subject.find({ classId: { $in: classIds } })
      .populate("subjectTeachers", "name email")
      .populate("classId", "className")
      .select("subjectName classId subjectTeachers")
      .lean();

    // 5. Today's Attendance Status per Class
    const todayAttendanceRecords = await Attendance.find({
      classRef: { $in: classIds },
      date: { $gte: today, $lt: new Date(today.getTime() + 24*60*60*1000) }
    }).select("classRef").lean();

    const todayTakenForClasses = new Set(
      todayAttendanceRecords.map(r => r.classRef.toString())
    );

    // 6. Monthly Stats (optimized)
    const monthlyStats = await Attendance.aggregate([
      {
        $match: {
          classRef: { $in: classIds.map(id => new mongoose.Types.ObjectId(id)) },
          date: { $gte: thirtyDaysAgo }
        }
      },
      { $unwind: "$attendance" },
      {
        $group: {
          _id: null,
          totalStudents: { $sum: 1 },
          presentStudents: { $sum: { $cond: [{ $eq: ["$attendance.status", "P"] }, 1, 0] } }
        }
      }
    ]);

    const monthly = monthlyStats[0] || { totalStudents: 0, presentStudents: 0 };
    const monthlyAttendanceRate = monthly.totalStudents > 0
      ? Math.round((monthly.presentStudents / monthly.totalStudents) * 100)
      : 0;

    // Today's Summary
    const todayStats = await Attendance.aggregate([
      {
        $match: {
          classRef: { $in: classIds.map(id => new mongoose.Types.ObjectId(id)) },
          date: { $gte: today, $lt: new Date(today.getTime() + 24*60*60*1000) }
        }
      },
      { $unwind: "$attendance" },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ["$attendance.status", "P"] }, 1, 0] } }
        }
      }
    ]);

    const todaySummary = todayStats[0] || { total: 0, present: 0 };
    todaySummary.percentage = todaySummary.total > 0
      ? Math.round((todaySummary.present / todaySummary.total) * 100)
      : 0;

    res.render("teachers/teacherDashboard", {
      teacher,
      classTeacherOf,
      assignedClasses,
      students: formattedStudents,
      subjectsOfClasses,
      todayTakenForClasses: Array.from(todayTakenForClasses), // array of class IDs (strings)
      todayAttendanceSummary: todaySummary,
      monthlyAttendanceRate
    });

  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).send("Server Error");
  }
});

handelTeacher.get("/logout", teacherAuth, (req, res) => {
  res.clearCookie("TeacherToken");
  res.redirect("/teacher/login");
});


const otpStore = new Map();


// ====================
// Step 1: Enter CMT ID or Email
// ====================
handelTeacher.get("/forgot-password", (req, res) => {
  res.render("teacherForgotRequest", { message: null });
});

handelTeacher.post("/forgot-password", async (req, res) => {
  try {
    const { identifier } = req.body; // CMT ID or email
    const teacher = await Teacher.findOne({
      $or: [{ teacherID: identifier }, { email: identifier }]
    });
    if (!teacher) {
      return res.render("teacherForgotRequest", { message: "Teacher not found" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore.set(identifier, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

    // Send OTP via email
    sendVerificationEmail(otp, teacher.email, "Your School", teacher._id.toString());

    res.render("teacherVerifyOtp", { identifier, message: "OTP sent to your email" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// ====================
// Step 2: Verify OTP
// ====================
handelTeacher.post("/forgot-password/verify", async (req, res) => {
  try {
    const { identifier, otp } = req.body;
    const record = otpStore.get(identifier);

    if (!record) return res.render("teacherForgotRequest", { message: "No OTP found. Request again." });
    if (Date.now() > record.expiresAt) {
      otpStore.delete(identifier);
      return res.render("teacherForgotRequest", { message: "OTP expired. Request again." });
    }
    if (otp !== record.otp) return res.render("teacherVerifyOtp", { identifier, message: "Invalid OTP" });

    // OTP valid → show reset password page
    res.render("teacherResetPassword", { identifier, message: null });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// ====================
// Step 3: Reset Password
// ====================
handelTeacher.post("/forgot-password/reset", async (req, res) => {
  try {
    const { identifier, newPassword } = req.body;

    const teacher = await Teacher.findOne({
      $or: [{ teacherID: identifier }, { email: identifier }]
    });

    if (!teacher) return res.render("teacherForgotRequest", { message: "Teacher not found" });

    const hashedPwd = await bcrypt.hash(newPassword, 10);
    teacher.password = hashedPwd;
    await teacher.save();

    otpStore.delete(identifier); // Remove OTP

    res.redirect("/teacher/login");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// GET: Create Student Page
handelTeacher.get("/class/:classId/create-student", teacherAuth, async (req, res) => {
  try {
    const teacher = req.teacher;
    const classId = req.params.classId;

    // Validate ownership: teacher must be class teacher
    const classData = await Class.findOne({
      _id: classId,
      classTeacher: teacher.id
    }).lean();

    if (!classData) {
      return res.status(403).send("Not allowed: You are not the class teacher");
    }

    res.render("teachers/createStudent", {
      teacher,
      classData,
      msg: null
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

// POST: Create Student
handelTeacher.post("/class/:classId/create-student", teacherAuth, async (req, res) => {
  try {
    const teacher = req.teacher;
    const classId = req.params.classId;

    const classData = await Class.findOne({
      _id: classId,
      classTeacher: teacher.id
    });

    if (!classData) {
      return res.render("teachers/createStudent", {
        teacher: req.teacher,
        classData,
        msg: "Not allowed: You are not the class teacher"
      });
    }

    const { name, email } = req.body;

    const newStudent = await Student.create({
      name,
      email,
      classId,
      school: teacher.schoolId,   // auto-set
      password: "CMSDEFP"         // default
    });

    // OPTIONAL: Increase student count in Class
    await Class.findByIdAndUpdate(classId, { $inc: { studentCount: 1 } });

    res.redirect(`/teacher/dashboard`);

  } catch (err) {
    console.log(err);

    if (err.code === 11000) {
      const classId = req.params.classId;
      const classData = await Class.findOne({
        _id: classId,
        classTeacher: req.teacher.id
      });
      return res.render("teachers/createStudent", {
        teacher: req.teacher,
        classData,
        msg: "Email already exists"
      });
    }

    res.status(500).send("Server error");
  }
});

// Update Email
handelTeacher.post("/student/update-email/:id", async (req, res) => {
  await Student.findByIdAndUpdate(req.params.id, { email: req.body.email });
  res.redirect("/teacher/dashboard");
});

// Delete Student
handelTeacher.post("/student/delete/:id", async (req, res) => {
  await Student.findByIdAndDelete(req.params.id);
  res.redirect("/teacher/dashboard");
});

// Suspend Student
handelTeacher.post("/student/suspend/:id", async (req, res) => {
  const days = parseInt(req.body.days);
  const until = new Date();
  until.setDate(until.getDate() + days);

  await Student.findByIdAndUpdate(req.params.id, {
    suspendedUntil: until,
    status: "SUSPENDED"
  });

  res.redirect("/teacher/dashboard");
});

// Unsuspend
handelTeacher.post("/student/unsuspend/:id", async (req, res) => {
  await Student.findByIdAndUpdate(req.params.id, {
    suspendedUntil: null,
    status: "ACTIVE"
  });

  res.redirect("/teacher/dashboard");
});



// GET: Assign Teachers to All Subjects in a Class
handelTeacher.get("/class/:classId/assign-subject-teachers", teacherAuth, async (req, res) => {
  try {
    const classId = req.params.classId;

    // Logged-in teacher details
    const teacher = await Teacher.findById(req.teacher.id);
    // Find class details
    const classData = await Class.findById(classId).lean();
    if (!classData) return res.status(404).send("Class not found");

    // Fetch all teachers from same school
    const teacherList = await Teacher.find({ schoolId: teacher.schoolId }).lean();

    res.render("teachers/assignSubjectTeachers", {
      teacher,
      classData,
      teacherList
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});


// POST: Save Assigned Subject Teachers
handelTeacher.post(
  "/class/:classId/assign-subject-teachers",
  teacherAuth,
  async (req, res) => {
    try {
      const classId = req.params.classId;
      const { assignments } = req.body; 
      // assignments = { Math: "teacherId", English: "teacherId", ... }

      const classData = await Class.findById(classId);
      if (!classData) return res.status(404).send("Class not found");

      const schoolId = classData.school;

      // Loop through each subject → create or update Subject model
      for (const [subjectName, teacherId] of Object.entries(assignments)) {

        // Skip empty selections
        if (!teacherId || teacherId.trim() === "") continue;

        // Check if subject already exists
        let subjectDoc = await Subject.findOne({
          subjectName,
          classId
        });

        if (!subjectDoc) {
          // Create new subject record
          subjectDoc = new Subject({
            subjectName,
            classId,
            subjectTeachers: [teacherId], // assign teacher
            createdBy: schoolId
          });
        } else {
          // Update assigned teachers
          subjectDoc.subjectTeachers = [teacherId];
        }

        await subjectDoc.save();
      }

      res.redirect("/teacher/dashboard");

    } catch (err) {
      console.error(err);
      res.status(500).send("Server Error");
    }
  }
);






// Display attendance sheet for a class on a date
// GET - Take/Edit Attendance (already perfect)
handelTeacher.get("/class/:classId/attendance", teacherAuth, async (req, res) => {
  try {
    const classId = req.params.classId;

    const students = await Student.find({ classId }).lean().sort({ name: 1 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendanceRecord = await Attendance.findOne({
      classRef: classId,
      date: today
    }).lean();

    res.render("teachers/attendance", {
      classId,
      students,
      attendanceRecord,
      today: today.toISOString().split("T")[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// POST - Save Attendance (FIXED & IMPROVED)
handelTeacher.post("/class/:classId/attendance", teacherAuth, async (req, res) => {
  try {
    const classId = req.params.classId;
    const teacherId = req.teacher.id;
    const rawAttendance = req.body.attendance; // { studentId: "P" or "A" }

    // Convert object → proper array format
    const attendance = Object.entries(rawAttendance).map(([studentId, status]) => ({
      studentRef: studentId,
      status: status.trim().toUpperCase() === "P" ? "P" : "A" // sanitize
    }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendanceDoc = await Attendance.findOne({ classRef: classId, date: today });

    if (attendanceDoc) {
      attendanceDoc.attendance = attendance;
      await attendanceDoc.save();
    } else {
      attendanceDoc = new Attendance({
        date: today,
        classRef: classId,
        classTeacherRef: teacherId,
        attendance
      });
      await attendanceDoc.save();
    }

    // Optional: Flash message
    req.flash && req.flash("success", "Attendance saved successfully!");

    res.redirect("/teacher/dashboard");
  } catch (err) {
    console.error("Attendance Save Error:", err);
    req.flash && req.flash("error", "Failed to save attendance");
    res.redirect("back");
  }
});1




module.exports = handelTeacher;
