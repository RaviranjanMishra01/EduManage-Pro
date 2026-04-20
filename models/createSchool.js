const mongoose = require("mongoose");

const schoolSchema = new mongoose.Schema(
  {
    schoolName: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 60,
    },
    
    email: {
      type: String,
      required: true,
      unique:true,
      lowercase: true,
      trim: true,
      match: /^[a-zA-Z0-9.]{3,30}@[a-zA-Z0-9.-]{2,}\.[A-Za-z]{2,}$/,
    },

    schoolId: {
      type: String,
      default: null,
      unquie:true,
      minlength: 3,
      maxlength: 20,
    },
    maxStudents: {
      type: Number,
      required: true,
      min: 10,
      max: 50000,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    cmsID:{
      type:String,
      required:true,
      unique:true,
    }
  },
  { timestamps: true }
);

const CreateSchool=mongoose.model("School", schoolSchema);
module.exports = CreateSchool;
