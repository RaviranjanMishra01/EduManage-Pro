const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const mongoose = require("mongoose");
const { throwError } = require("./utils/defined_error");
const CreateSchool = require("./models/createSchool.js");
const bcrypt = require("bcrypt");
const ContactMessage=require("./models/contact.js");
const cookieParser = require("cookie-parser");

// Load environment variables
dotenv.config();

// Connect Database
const connectDB = require("./connect_mongoDB");
const handelSchool = require("./routes/handelSchool.js");

// Initialize app
const app = express();

// Connect DB
connectDB()
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.error("Database connection failed:", err));

// Set EJS View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

// test change
const session = require("express-session");
const handelTeacher = require("./routes/handelTeacher.js");

app.use(
  session({
    secret: process.env.SESSION_SECRET || "strong_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 60 * 60 * 1000, // 1 hour
      httpOnly: true,
      secure: false, // set true if using HTTPS
    },
  })
);


// Home Page using EJS layout
app.get("/", (req, res) => {
 res.render("index")
});

app.get("/home", (req, res) => {
  return res.render("home"); // ⬅ no need .ejs
});

// Additional route example
app.get("/about", (req, res) => {
  res.render("about", { title: "About Us" });
});

app.get("/contact", (req, res) => {
  res.render("contact",{submitt:false,form:false});
});

app.post("/contact/submit", async (req, res) => {
  const { name, email, message } = req.body;

  try {
    await ContactMessage.create({ name, email, message });
    return res.render("contact", { form: true, submitt: true });
  } catch (err) {
    console.error("Error saving contact form:", err);
    return res.render("contact", { form: true, submitt: false });
  }
});

app.use("/school",handelSchool)
app.use("/teacher",handelTeacher);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});




