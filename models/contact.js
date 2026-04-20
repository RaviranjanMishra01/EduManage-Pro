const mongoose = require("mongoose");

const ContactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 40,
      match: /^[A-Za-z]{3,}(?:\s[A-Za-z]{3,})?$/,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique:true,
      lowercase: true,
      trim: true,
      match: /^[a-zA-Z0-9.]{3,30}@[a-zA-Z0-9.-]{2,}\.[A-Za-z]{2,}$/,
    },

    message: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 500,
      trim: true,
    },
  },
  { timestamps: true }
);

const ContactMessage = mongoose.model("ContactMessage", ContactMessageSchema);

module.exports = ContactMessage;