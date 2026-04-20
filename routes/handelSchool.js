const express = require("express");
const bcrypt = require("bcrypt");
const CreateSchool = require("../models/createSchool.js");
const {generateUniqueCmsId, tgenerateUniqueCmsId} = require("../utils/genrateCMSId.js");
const sendVerificationEmail = require("../mail/emails.js");
const verificationToken = require("../utils/verificationToken.js");
const handelSchool = express.Router();
const jwt = require("jsonwebtoken");
const Teacher = require("../models/teacher.js");
const Class = require("../models/class.js");
const {redirectIfAuthenticated, schoolAuth} = require("../middleware/schoolAuth.js");

// OTP and Rate Limit Store (Use Redis in Production)
const otpStore = new Map();      // email => { otp, expiresAt }
const attempts = new Map();      // email => wrong attempts
const rateLimit = new Map();     // email => { firstAttempt, lastSent, count }

// Email format validation
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Check Rate Limit
function canSendOtp(email) {
  const limit = rateLimit.get(email);
  if (!limit) return true;

  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneMinuteAgo = now - 60 * 1000;

  if (limit.lastSent > oneMinuteAgo) return false;
  if (!limit.firstAttempt || limit.firstAttempt < oneHourAgo) return true;
  if (limit.count >= 5) return false;

  return true;
}

// Update Rate Limit
function updateRateLimit(email) {
  const now = Date.now();
  const limit = rateLimit.get(email);

  if (!limit || (limit.firstAttempt && limit.firstAttempt < now - 60 * 60 * 1000)) {
    return rateLimit.set(email, {
      firstAttempt: now,
      lastSent: now,
      count: 1,
    });
  }

  rateLimit.set(email, {
    firstAttempt: limit.firstAttempt,
    lastSent: now,
    count: limit.count + 1,
  });
}

// GET create school
handelSchool.get("/create", (req, res) => {
  res.render("createSchool", { form: false });
});

// SEND OTP
handelSchool.post("/create", async (req, res) => {
  const { schoolName, schoolId, maxStudents, password, confirmPassword, email } = req.body;

  try {
    if (!isValidEmail(email)) {
      return res.render("createSchool", { form: true, success: false, message: "Invalid email format!" });
    }

    if (password !== confirmPassword) {
      return res.render("createSchool", { form: true, success: false, message: "Passwords do not match!" });
    }

    const exist = await CreateSchool.findOne({ email });
    if (exist) {
      return res.render("createSchool", { form: true, success: false, message: "Email already registered!" });
    }

    if (!canSendOtp(email)) {
      return res.render("createSchool", { form: true, success: false, message: "OTP request limit reached. Try later." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    otpStore.set(email, { otp, expiresAt });
    attempts.set(email, 0);
    updateRateLimit(email);

    // Store registration data without password (security fix)
    req.session.schoolData = { schoolName, schoolId, maxStudents, email, password };

    await sendVerificationEmail(otp, email, schoolName, "PENDING");
    return res.render("verifySchoolOtp", { email, message: null });

  } catch (err) {
    console.error("OTP sending error:", err);
    return res.render("createSchool", { form: true, success: false, message: "Failed to send OTP. Try again." });
  }
});

// VERIFY OTP
handelSchool.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!req.session.schoolData || req.session.schoolData.email !== email) {
    return res.render("createSchool", { form: true, success: false, message: "Session expired. Try again!" });
  }

  if (!/^\d{6}$/.test(otp)) {
    return res.render("verifySchoolOtp", { email, message: "Invalid OTP format!" });
  }

  const data = otpStore.get(email);
  if (!data) {
    return res.render("verifySchoolOtp", { email, message: "OTP expired or invalid. Request a new one." });
  }

  const { otp: storedOtp, expiresAt } = data;

  if (Date.now() > expiresAt) {
    otpStore.delete(email);
    return res.render("verifySchoolOtp", { email, message: "OTP expired! Request a new one." });
  }

  const currentAttempts = attempts.get(email) || 0;
  if (currentAttempts >= 3) {
    otpStore.delete(email);
    attempts.delete(email);
    rateLimit.delete(email);
    return res.render("createSchool", { form: true, success: false, message: "Too many wrong attempts. Restart registration." });
  }

  if (storedOtp !== otp) {
    attempts.set(email, currentAttempts + 1);
    return res.render("verifySchoolOtp", {
      email,
      message: `Incorrect OTP! Attempts left: ${3 - (currentAttempts + 1)}`
    });
  }

  // OTP verified successfully
  otpStore.delete(email);
  attempts.delete(email);
  rateLimit.delete(email);

  try {
    const { schoolName, schoolId, maxStudents, password } = req.session.schoolData;
    const hashedPwd = await bcrypt.hash(password, 10);
    const cmsID = await generateUniqueCmsId(CreateSchool);
   

    await CreateSchool.create({
      schoolName,
      schoolId: cmsID || null,
      maxStudents: Number(maxStudents),
      email,
      password: hashedPwd,
      cmsID,
    });

    req.session.schoolData = null;

    return res.render("showId", {
      school: true,
      schoolId:cmsID,
      teacher: false,
      teacherId: null
    });

  } catch (err) {
    console.error("School creation error:", err);
    return res.render("createSchool", { form: true, success: false, message: "Error saving school." });
  }
});

// RESEND OTP
handelSchool.post("/resend-otp", async (req, res) => {
  const { email } = req.body;

  if (!email || !req.session.schoolData) {
    return res.render("createSchool", { form: true, success: false, message: "Session expired!" });
  }

  if (!canSendOtp(email)) {
    return res.render("verifySchoolOtp", { email, message: "OTP resend limit reached. Try later." });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  otpStore.set(email, { otp, expiresAt });
  attempts.set(email, 0);
  updateRateLimit(email);

  const schoolName = req.session.schoolData.schoolName;
  await sendVerificationEmail(otp, email, schoolName, "PENDING");

  return res.render("verifySchoolOtp", { email, message: "New OTP sent successfully!" });
});



// School dashbard
handelSchool.get("/login",redirectIfAuthenticated,(req,res)=>{
    res.render("schoolLogin", { message: null });
})
handelSchool.post("/login",async (req,res)=>{
  try {
    const { identifier, password } = req.body;

    // Find school using email or CMS ID
    const school = await CreateSchool.findOne({
      $or: [{ email: identifier }, { schoolId: identifier }]
    });

    if (!school) {
      return res.render("schoolLogin", { message: "Invalid email/CMS ID or password" });
    }

    // Compare password
    const match = await bcrypt.compare(password, school.password);
    if (!match) {
      return res.render("schoolLogin", { message: "Invalid email/CMS ID or password" });
    }

    // Create JWT Payload
    const payload = {
      _id: school._id,
      email: school.email,
      schoolName: school.schoolName,
      cmsID: school.cmsID
    };

    // Sign Token
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "60m" });

    // Store token + basic data in cookies
  res.cookie("SchoolToken", token, {
  httpOnly: true,
  sameSite: "strict",   // helps prevent CSRF
  secure: false, // only HTTPS in production
  maxAge: 60 * 60 * 1000 // 1 hour
});


    res.cookie("schoolName", school.schoolName);
    res.cookie("schoolEmail", school.email);
    res.cookie("schoolId", school.schoolId);

    return res.redirect("/school/dashboard");

  } catch (error) {
    console.log("Login Error:", error);
    return res.render("schoolLogin", { message: "Server error! Try again later" });
  }
})


// dashboard route
handelSchool.get("/dashboard", schoolAuth, async (req, res) => {
  const schoolId = req.school._id;
  const q = req.query.q || "";
  const cq = req.query.cq || "";
  const msg = req.query.msg || "";

  const teacherPage = Number(req.query.tpage) || 1;
  const classPage = Number(req.query.cpage) || 1;

  const limit = 10;

  // --- Teachers Query ---
  const teacherFilter = {
    schoolId,
    $or: [
      { name: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
      { phone: { $regex: q, $options: "i" } },
    ],
  };

  const totalTeachers = await Teacher.countDocuments({ schoolId });
  const suspendedCount = await Teacher.countDocuments({
    schoolId,
    suspendedUntil: { $gte: new Date() },
  });

  const teachers = await Teacher.find(teacherFilter)
    .skip((teacherPage - 1) * limit)
    .limit(limit)
    .lean();

  const teacherTotalPages = Math.ceil(
    (await Teacher.countDocuments(teacherFilter)) / limit
  );

  // --- Classes Query ---
  const classFilter = {
    school: schoolId,
    className: { $regex: cq, $options: "i" },
  };

  const totalClasses = await Class.countDocuments({ school: schoolId });

  const classes = await Class.find(classFilter)
    .populate("classTeacher", "name") // populate teacher name
    .skip((classPage - 1) * limit)
    .limit(limit)
    .lean();

  // Map classes to frontend-friendly fields
  const mappedClasses = classes.map(c => ({
    _id: c._id,
    className: c.className,
    classTeacherName: c.classTeacher ? c.classTeacher.name : "N/A",
    subjects: c.subjects || [],
    totalStudents: c.studentCount || 0,
    presentToday: c.presentToday || 0, // optional: set 0 if not tracked
    isActive: c.status === "ACTIVE",
  }));

  // avg attendance calculation
  let avgAttendance = 0;
  if (mappedClasses.length) {
    const sum = mappedClasses.reduce((acc, c) => {
      if (!c.totalStudents || !c.presentToday) return acc;
      return acc + (c.presentToday / c.totalStudents) * 100;
    }, 0);
    avgAttendance = (sum / mappedClasses.length).toFixed(1);
  }

  const classTotalPages = Math.ceil(
    (await Class.countDocuments(classFilter)) / limit
  );

  return res.render("schoolDashboard", {
    schoolName: req.school.schoolName,
    totalTeachers,
    totalClasses,
    suspendedCount,
    avgAttendance,

    teachers,
    teacherPage,
    teacherTotalPages,
    q,

    classes: mappedClasses,
    classPage,
    classTotalPages,
    cq,
    msg
  });
});



handelSchool.get("/logout", schoolAuth, (req, res) => {
  res.clearCookie("SchoolToken");
  res.clearCookie("schoolName");
  res.clearCookie("schoolEmail");
  res.clearCookie("schoolId");
  return  res.redirect("/school/login");
});

// handelteacher
// CREATE TEACHER - FORM
handelSchool.get("/teachers/create", schoolAuth, (req, res) => {
  res.render("teachers/createTeacher", { message: null });
});

// CREATE TEACHER - SUBMIT
handelSchool.post("/teachers/create", schoolAuth, async (req, res) => {
  const { name, email, phone, subject, salary, password } = req.body;
  const schoolId = req.school._id;
  const schoolCmsID = req.school.cmsID; // Make sure this is correct
  const last5 = schoolCmsID.slice(-5); // get last 5 characters
  const teacherId = await tgenerateUniqueCmsId(Teacher); // append last 5 chars

  try {
    // Check if teacher already exists
    const exist = await Teacher.findOne({ email });
    if (exist) {
      return res.render("teachers/createTeacher", { message: "Email already exists!" });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create teacher
    await Teacher.create({
      name,
      email,
      phone,
      subject,
      salary: salary || 0, // default to 0 if not provided
      password: hashed,
      teacherID: teacherId,
      schoolId
    });

    res.redirect("/school/teachers/create"); // or wherever you want to redirect
  } catch (err) {
    console.error(err);
    res.render("teachers/createTeacher", { message: "Something went wrong!" });
  }
});


// SUSPEND TEACHER
// handelSchool.get("/teachers/suspend/:id", schoolAuth, async (req, res) => {
//   const teacher = await Teacher.find({})
//   res.render("teachers/suspendTeacher", { teacher });
// });


// Suspend Teacher
handelSchool.post("/teachers/suspend/:id", schoolAuth, async (req, res) => {
  try {
    const {  id } = req.params;
    const { days } = req.body;
    if (!id || !days) {
      return res.redirect("/school/dashboard?msg=" + encodeURIComponent("Teacher ID and number of days are required."));
    }

    const teacher = await Teacher.findById(id);
    if (!teacher) {
      return res.redirect("/school/dashboard?msg=" + encodeURIComponent("Teacher not found."));
    }

    const schoolId = teacher.schoolId;

    // Count unsuspended teachers excluding the one we want to suspend
   const unsuspendedCount = await Teacher.countDocuments({
  schoolId: schoolId,
  _id: { $ne: id }, // exclude the teacher we want to suspend
  $or: [
    { suspendedUntil: { $exists: false } }, // never suspended
    { suspendedUntil: null },               // explicitly null
    { suspendedUntil: { $lt: new Date() } } // suspension expired
  ]
});


    if (unsuspendedCount < 1) {
      return res.redirect("/school/dashboard?msg=" + encodeURIComponent("Cannot suspend: at least one teacher must remain active."));
    }

    // Calculate suspension date
    const until = new Date();
    until.setDate(until.getDate() + Number(days));

    // Update teacher
    await Teacher.findByIdAndUpdate(id, { suspendedUntil: until });

    res.redirect("/school/dashboard?msg=" + encodeURIComponent("Teacher suspended successfully!"));
  } catch (err) {
    console.error("Suspend Teacher Error:", err);
    res.redirect("/school/dashboard?msg=" + encodeURIComponent("Server Error. Try again."));
  }
});



// DELETE TEACHER
// Delete Teacher
handelSchool.post("/teachers/delete/:id", schoolAuth, async (req, res) => {
  try {
    const { teacherId } = req.body;

    if (!teacherId) {
      return res.redirect("/school/dashboard?msg=" + encodeURIComponent("Teacher ID is required."));
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.redirect("/school/dashboard?msg=" + encodeURIComponent("Teacher not found."));
    }

    const schoolId = teacher.schoolId || teacher.school;

    // Count unsuspended teachers excluding current teacher
    const unsuspendedCount = await Teacher.countDocuments({
      schoolId,
      _id: { $ne: teacherId },
      $or: [
        { suspendedUntil: { $exists: false } },
        { suspendedUntil: { $lt: new Date() } }
      ]
    });

    if (unsuspendedCount < 1) {
      return res.redirect("/school/dashboard?msg=" + encodeURIComponent("Cannot delete: at least one teacher must remain active."));
    }

    // Delete teacher
    await Teacher.findByIdAndDelete(teacherId);

    res.redirect("/school/dashboard?msg=" + encodeURIComponent("Teacher deleted successfully!"));

  } catch (err) {
    console.error("Delete Teacher Error:", err);
    res.redirect("/school/dashboard?msg=" + encodeURIComponent("Server Error. Try again."));
  }
});


// UNSUSPEND TEACHER
handelSchool.post("/teachers/unsuspend/:id", schoolAuth, async (req, res) => {
  const teacherId = req.params.id;
  await Teacher.findByIdAndUpdate(teacherId, { suspendedUntil: null });
  res.redirect("/school/dashboard");
});

handelSchool.get("/forgot-password", (req, res) => {
  res.render("schoolForgotPassword", { message: null });
});



const resetOtpStore = new Map(); 
// email => { otp, expiresAt }
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function handleForgotPasswordSubmit(input, Model) {
  let user;

  // If input looks like email
  if (isValidEmail(input)) {
    user = await Model.findOne({ email: input });
  } else {
    // Otherwise CMS ID or TeacherID
    user = await Model.findOne({ cmsID: input }) || await Model.findById(input);
  }

  if (!user) return { success: false, msg: "No account found!" };

  const otp = generateOtp();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  resetOtpStore.set(user.email, { otp, expiresAt });

  await sendVerificationEmail(otp, user.email, user.schoolName || user.name, user.cmsID ? "SCHOOL-"+user.cmsID : "TEACHER");

  return { success: true, email: user.email };
}

async function handleVerifyResetOtp(email, otp) {
  const data = resetOtpStore.get(email);
  if (!data) return { success: false, msg: "OTP expired!" };

  if (Date.now() > data.expiresAt) {
    resetOtpStore.delete(email);
    return { success: false, msg: "OTP expired!" };
  }

  if (data.otp !== otp) {
    return { success: false, msg: "Incorrect OTP!" };
  }

  return { success: true };
}

async function handlePasswordUpdate(email, newPassword, Model) {
  const hashed = await bcrypt.hash(newPassword, 10);
  await Model.findOneAndUpdate({ email }, { password: hashed });
  resetOtpStore.delete(email);
  return true;
}

handelSchool.post("/forgot-password", async (req, res) => {
  const { input } = req.body;

  const result = await handleForgotPasswordSubmit(input, CreateSchool);

  if (!result.success) {
    return res.render("schoolForgotPassword", { message: result.msg });
  }

  req.session.resetEmail = result.email;
  res.render("schoolForgotOtp", { email: result.email, message: null });
});

handelSchool.post("/forgot-password/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  const result = await handleVerifyResetOtp(email, otp);
  if (!result.success) {
    return res.render("schoolForgotOtp", { email, message: result.msg });
  }

  req.session.resetEmail = email;
  res.render("schoolResetPassword", { email, message: null });
});

handelSchool.post("/forgot-password/reset", async (req, res) => {
  const { password } = req.body;
  const email = req.session.resetEmail;

  if (!email) {
    return res.render("schoolForgotPassword", { message: "Session expired!" });
  }

  await handlePasswordUpdate(email, password, CreateSchool);

  req.session.resetEmail = null;
  res.render("schoolLogin", { message: "Password reset successfully!" });
});


handelSchool.get("/classes/create", schoolAuth, async (req, res) => {
  try {
    // Find all teachers of this school
    const teachers = await Teacher.find({ schoolId: req.school._id }).sort({ name: 1 });

    // Fixed subject list
    const subjects = [
      "Math", "English", "Science", "History", "Geography",
      "Hindi", "Sanskrit", "Physics", "Chemistry", "Biology",
      "Computer", "Music", "Games", "Arts"
    ];

    res.render("classes/createClass", {
      message: null,
      teachers,
      subjects
    });
  } catch (err) {
    console.error(err);
    res.render("classes/createClass", {
      message: "Something went wrong while fetching teachers.",
      teachers: [],
      subjects: []
    });
  }
});

handelSchool.post("/classes/create", schoolAuth, async (req, res) => {
  const { className, teacher, maxStudents, subjects } = req.body;
  const schoolId = req.school._id;

  // Ensure subjects is an array (checkboxes)
  const selectedSubjects = Array.isArray(subjects) ? subjects : [subjects];

  // Server-side validation: minimum 5 subjects
  if (!selectedSubjects || selectedSubjects.length < 5) {
    const teachers = await Teacher.find({ schoolId }).sort({ name: 1 });
    const subjectList = [
      "Math", "English", "Science", "History", "Geography",
      "Hindi", "Sanskrit", "Physics", "Chemistry", "Biology",
      "Computer", "Music", "Games", "Arts"
    ];
    return res.render("classes/createClass", { 
      message: "Please select at least 5 subjects.",
      teachers,
      subjects: subjectList
    });
  }

  try {
    await Class.create({
      className,
      classTeacher:teacher,
      school: schoolId,
      maxStudents: Number(maxStudents) || 40,
      subjects: selectedSubjects
    });

    res.redirect("/school/classes/create"); // redirect to form or class list
  } catch (err) {
    console.error(err);
    const teachers = await Teacher.find({ schoolId }).sort({ name: 1 });
    const subjectList = [
      "Math", "English", "Science", "History", "Geography",
      "Hindi", "Sanskrit", "Physics", "Chemistry", "Biology",
      "Computer", "Music", "Games", "Arts"
    ];
    res.render("classes/createClass", { 
      message: "Something went wrong!",
      teachers,
      subjects: subjectList
    });
  }
});



// GET: List classes with optional search & pagination
// handelSchool.get("/classes", async (req, res) => {
//   try {
//     const { page = 1, limit = 10, search = "" } = req.query;
//     const query = search ? { className: { $regex: search, $options: "i" } } : {};

//     const totalClasses = await Class.countDocuments(query);
//     const totalPages = Math.ceil(totalClasses / limit);

//     const classes = await Class.find(query)
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit))
//       .lean();

//     res.render("classes", {
//       classes,
//       classPage: parseInt(page),
//       classTotalPages: totalPages,
//       cq: search
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Server Error");
//   }
// });

// POST: Activate class

// Activate class
handelSchool.get("/classes/activate/:id", async (req, res) => {
  try {
    await Class.findByIdAndUpdate(req.params.id, { status: "ACTIVE" });
    res.redirect("/school/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Deactivate (archive) class
handelSchool.get("/classes/deactivate/:id", async (req, res) => {
  try {
    await Class.findByIdAndUpdate(req.params.id, { status: "ARCHIVED" });
    res.redirect("/school/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Delete class
handelSchool.get("/classes/delete/:id", async (req, res) => {
  try {
    await Class.findByIdAndDelete(req.params.id);
    res.redirect("/school/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// GET edit class form
// GET edit class form
handelSchool.get("/classes/edit/:id", async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id)
      .populate("classTeacher", "name") // Optional: get teacher name
      .lean();

    if (!cls) return res.status(404).send("Class not found");

    // Fetch all teachers for the dropdown
   const now = new Date();

// Fetch only teachers who are not suspended
const teachers = await Teacher.find({
  $or: [
    { suspendedUntil: null },
    { suspendedUntil: { $lte: now } } // suspension has ended
  ]
})
.select("name")
.lean();

console.log(teachers);
    res.render("editClass", { cls, teachers }); // <-- pass teachers here
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});


// POST update class
handelSchool.post("/classes/edit/:id", async (req, res) => {
  try {
    let { className, classTeacher, maxStudents } = req.body;

    maxStudents = parseInt(maxStudents) || 40;

    // Enforce limits
    if (maxStudents < 10) maxStudents = 10;
    if (maxStudents > 100) maxStudents = 100;

    await Class.findByIdAndUpdate(req.params.id, {
      className: className.trim(),
      classTeacher,
      maxStudents,
    });

    res.redirect("/school/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});




module.exports = handelSchool;
