const VERIFICATION_EMAIL_TEMPLATE = `
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verification</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #202A44;">
  <div style="background: #0D6EFD; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
    <h1 style="color: white; margin: 0;">{schoolName}</h1>
  </div>

  <div style="background-color: #ffffff; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hello,</p>
    <p>To continue with creating a school account for <strong>{accountId}</strong>, use the OTP below:</p>

    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0D6EFD;">{verificationCode}</span>
    </div>

    <p>This OTP is valid for <strong>10 minutes</strong>.</p>

    <p>If you did not request this, you can ignore this email.</p>

    <p>Regards,<br><strong> EduManage.png System</strong></p>
  </div>

  <div style="text-align: center; margin-top: 20px; color: #aaa; font-size: 0.8em;">
    <p>This is an automated message. Do not reply.</p>
  </div>
</body>
</html>
`;

module.exports = VERIFICATION_EMAIL_TEMPLATE;
