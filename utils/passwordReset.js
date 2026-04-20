const bcrypt = require("bcrypt");
const { generateOtp, saveOtp, verifyOtp } = require("./Otp.js");
const { isValidEmail } = require("./validators.js");

async function handleForgotSubmit(input, Model) {
  let user;

  if (isValidEmail(input)) {
    user = await Model.findOne({ email: input });
  } else {
    user = await Model.findOne({ cmsID: input });
  }

  if (!user) return { success: false, msg: "No account found!" };

  const otp = generateOtp();
  saveOtp(user.email, otp);

  return { success: true, email: user.email, otp };
}

async function handlePasswordUpdate(email, newPassword, Model) {
  const hashed = await bcrypt.hash(newPassword, 10);
  await Model.findOneAndUpdate({ email }, { password: hashed });
  return true;
}

module.exports = {
  handleForgotSubmit,
  handlePasswordUpdate,
  verifyOtp
};
