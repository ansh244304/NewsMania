import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Skip the live SMTP probe during tests so Jest can exit cleanly
if (process.env.NODE_ENV !== "test") {
    transporter.verify((error) => {
        if (error) {
            console.error("SMTP ERROR:", error);
        }
    });
}

export const sendEmail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"Newsmania" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });

        return info;
    } catch (error) {
        console.error("Email sending failed:", error);
        throw error;
    }
};