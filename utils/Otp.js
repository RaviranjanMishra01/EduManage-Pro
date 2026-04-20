const otpStore = new Map();

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function saveOtp(email, otp, expireMinutes = 10) {
  const expiresAt = Date.now() + expireMinutes * 60 * 1000;
  otpStore.set(email, { otp, expiresAt });
}

function verifyOtp(email, otp) {
  const data = otpStore.get(email);
  if (!data) return { success: false, msg: "OTP expired or invalid" };

  if (Date.now() > data.expiresAt) {
    otpStore.delete(email);
    return { success: false, msg: "OTP expired" };
  }

  if (data.otp !== otp) return { success: false, msg: "Incorrect OTP" };

  otpStore.delete(email);
  return { success: true };
}

module.exports = { generateOtp, saveOtp, verifyOtp };
