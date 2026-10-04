import nodemailer from "nodemailer";

export type Inquiry = {
  name: string;
  organization: string;
  phone: string;
  email: string;
  area: string;
  message: string;
};

export function inquiryEmailConfigured() {
  return !!(process.env.INQUIRY_TO_EMAIL && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

export function inquiryEmailText(inquiry: Inquiry) {
  return [
    "A new consultation request was submitted through the International AES website.",
    "",
    `Name: ${inquiry.name}`,
    `Organization: ${inquiry.organization}`,
    `Phone: ${inquiry.phone}`,
    `Email: ${inquiry.email}`,
    `Area of need: ${inquiry.area}`,
    "",
    "Message:",
    inquiry.message,
    "",
    "This request is also saved in the client archive.",
  ].join("\n");
}

export async function sendInquiryEmail(inquiry: Inquiry) {
  const to = process.env.INQUIRY_TO_EMAIL?.trim();
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  if (!to || !user || !password) throw new Error("Inquiry email is not configured");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user)) {
    throw new Error("Inquiry email addresses are invalid");
  }

  const port = Number(process.env.SMTP_PORT || 465);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("SMTP_PORT is invalid");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user, pass: password },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    disableFileAccess: true,
    disableUrlAccess: true,
    maxRecipients: 1,
  });

  const result = await transport.sendMail({
    from: { name: "International AES Website", address: user },
    to,
    replyTo: inquiry.email,
    subject: "New consultation request | International AES",
    text: inquiryEmailText(inquiry),
  });
  if (result.accepted.length === 0) throw new Error("SMTP did not accept the notification recipient");
}
