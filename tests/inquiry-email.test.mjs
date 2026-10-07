import assert from "node:assert/strict";
import { after, test } from "node:test";
import { inquiryEmailConfigured, inquiryEmailText, sendInquiryEmail } from "../app/lib/inquiry-email.ts";

const originalFetch = globalThis.fetch;
const originalKey = process.env.RESEND_API_KEY;
const originalTo = process.env.INQUIRY_TO_EMAIL;

after(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = originalKey;
  if (originalTo === undefined) delete process.env.INQUIRY_TO_EMAIL;
  else process.env.INQUIRY_TO_EMAIL = originalTo;
});

const inquiry = {
  name: "Test Customer",
  organization: "Test Organization",
  phone: "+123456789",
  email: "customer@example.com",
  area: "Engineering",
  message: "Please contact me.",
};

test("Resend request preserves the inquiry notification", async () => {
  process.env.RESEND_API_KEY = "test-key";
  process.env.INQUIRY_TO_EMAIL = "info@international-aes.com";
  assert.equal(inquiryEmailConfigured(), true);

  let called = false;
  globalThis.fetch = async (url, options) => {
    called = true;
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.Authorization, "Bearer test-key");
    assert.equal(options.headers["Content-Type"], "application/json");
    const payload = JSON.parse(options.body);
    assert.deepEqual(payload, {
      from: "International AES Website <info@international-aes.com>",
      to: ["info@international-aes.com"],
      reply_to: inquiry.email,
      subject: "New consultation request | International AES",
      text: inquiryEmailText(inquiry),
    });
    return new Response(JSON.stringify({ id: "test-email-id" }), { status: 200 });
  };

  await sendInquiryEmail(inquiry);
  assert.equal(called, true);
});

test("Resend HTTP failures are reported without exposing the API key", async () => {
  process.env.RESEND_API_KEY = "test-key";
  process.env.INQUIRY_TO_EMAIL = "info@international-aes.com";
  globalThis.fetch = async () => new Response("Forbidden", { status: 403 });

  await assert.rejects(sendInquiryEmail(inquiry), error => {
    assert.equal(error.code, "RESEND_HTTP_403");
    assert.doesNotMatch(error.message, /test-key/);
    return true;
  });
});

test("email is disabled when a required server secret is missing", () => {
  delete process.env.RESEND_API_KEY;
  process.env.INQUIRY_TO_EMAIL = "info@international-aes.com";
  assert.equal(inquiryEmailConfigured(), false);
});
