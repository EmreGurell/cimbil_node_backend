"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerificationEmail = sendVerificationEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
async function sendVerificationEmail(to, firstName, code) {
    await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject: 'Cimbil - Email Verification',
        html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2>Hello ${firstName}!</h2>
        <p>Your verification code:</p>
        <h1 style="letter-spacing: 8px; font-size: 36px; color: #4CAF50;">${code}</h1>
        <p style="color: #888;">This code expires in 15 minutes.</p>
      </div>
    `,
    });
}
async function sendPasswordResetEmail(to, firstName, code) {
    await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject: 'Cimbil - Password Reset',
        html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2>Hello ${firstName}!</h2>
        <p>Your password reset code:</p>
        <h1 style="letter-spacing: 8px; font-size: 36px; color: #FF5722;">${code}</h1>
        <p style="color: #888;">This code expires in 15 minutes.</p>
        <p style="color: #888;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
    });
}
//# sourceMappingURL=email.service.js.map