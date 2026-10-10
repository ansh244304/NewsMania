import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.log("SMTP ERROR:", error);
    } else {
        console.log("SMTP SERVER IS READY");
    }
});

export const sendEmail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"Newsmania" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });

        console.log("Email sent:", info.messageId);

        return info;
    } catch (error) {
        console.log("Email sending failed:", error);
        throw error;
    }
};