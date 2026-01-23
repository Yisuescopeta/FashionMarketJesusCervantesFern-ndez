
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const user = process.env.EMAIL_USER || 'jesuscervantesfernandez2006@gmail.com';
const pass = process.env.EMAIL_PASSWORD || 'zhjm eaxs ehie xdkb';

console.log('Testing email with:', user);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: user,
        pass: pass
    }
});

transporter.sendMail({
    from: user,
    to: user, // Send to self
    subject: "Test Email from Script",
    html: "<p>It works!</p>"
}).then(info => {
    console.log('Success:', info.messageId);
}).catch(err => {
    console.error('Error:', err);
});
