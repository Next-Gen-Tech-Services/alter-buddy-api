import nodemailer from "nodemailer";

export const MailSender = nodemailer.createTransport({
     host: 'smtp.mailtrap.io',
     port: 2525,
     auth: {
       user: '55b2d9a2d90121', // get from Mailtrap
       pass: 'f56b3e52d8e9a3', // get from Mailtrap
     },
});
