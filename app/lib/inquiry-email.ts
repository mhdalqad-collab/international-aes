export type Inquiry = {
  name: string;
  organization: string;
  phone: string;
  email: string;
  area: string;
  message: string;
};

export function inquiryEmailConfigured() {
  return !!(process.env.INQUIRY_TO_EMAIL && process.env.RESEND_API_KEY);
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
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!to || !apiKey) throw new Error("Inquiry email is not configured");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    throw new Error("Inquiry recipient email address is invalid");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "International AES Website <onboarding@resend.dev>",
      to: [to],
      reply_to: inquiry.email,
      subject: "New consultation request | International AES",
      text: inquiryEmailText(inquiry),
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const error = new Error(`Resend rejected the inquiry notification (${response.status})`) as Error & { code: string };
    error.code = `RESEND_HTTP_${response.status}`;
    throw error;
  }
}
