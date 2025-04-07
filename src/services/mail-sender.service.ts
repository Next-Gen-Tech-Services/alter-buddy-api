import nodemailer from "nodemailer";

export const MailSender = nodemailer.createTransport({
     host: "smtp-relay.brevo.com",
     port: 587, // TLS port
     secure: false, // Must be false for STARTTLS (TLS upgrade after connection)
     auth: {
       user: "achawda866@gmail.com",
       pass: "r6p7KsULfXG1JC4A",
     },
     tls: {
       rejectUnauthorized: true, // Set to false only in dev/testing if facing cert issues
     },
});
