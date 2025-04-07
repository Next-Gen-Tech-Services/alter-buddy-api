import nodemailer from "nodemailer";

export const MailSender = nodemailer.createTransport({
  service: "smtp.mailtrap.io", // or any other email service provider
  port: 2525,
  auth: {
    user: "55b2d9a2d90121",
    pass: "f56b3e52d8e9a3",
  },
});
