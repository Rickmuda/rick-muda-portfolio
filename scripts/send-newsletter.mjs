// Emails every newsletter subscriber that the site was just updated. Runs as
// a step in .github/workflows/deploy.yml, right after the FTP deploy, on
// every push to main. Never fails the workflow: any problem here (missing
// secrets, a Supabase hiccup, a bounced address) is logged and swallowed so
// a broken newsletter send can never block a real deploy.
//
// One-time setup (you, the portfolio owner):
//   1. Follow the setup notes in src/newsletterConfig.js first (Supabase
//      project + supabase/schema.sql + the unsubscribe edge function).
//   2. Google Account -> Security -> 2-Step Verification -> App passwords ->
//      create one for "Mail". Gmail requires this; a normal account password
//      will not work here.
//   3. Add these as GitHub repo secrets (Settings -> Secrets and variables ->
//      Actions), alongside the existing FTP_* secrets:
//        SUPABASE_URL               - Project Settings -> API -> Project URL
//        SUPABASE_SERVICE_ROLE_KEY  - Project Settings -> API -> service_role key
//        GMAIL_USER                 - the Gmail address to send from
//        GMAIL_APP_PASSWORD         - the 16-character App Password from step 2
//
// Until those secrets exist, this script logs one line and exits cleanly.

import nodemailer from "nodemailer";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  GMAIL_USER,
  GMAIL_APP_PASSWORD,
  SITE_URL = "https://www.rickmuda.nl",
  UPDATE_MESSAGE = "The site just got a new update.",
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GMAIL_USER || !GMAIL_APP_PASSWORD) {
  console.log("Newsletter: not configured (missing secrets), skipping.");
  process.exit(0);
}

const listRes = await fetch(
  `${SUPABASE_URL}/rest/v1/subscribers?select=email,unsubscribe_token`,
  {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  },
);

if (!listRes.ok) {
  console.error("Newsletter: failed to fetch subscribers", listRes.status, await listRes.text());
  process.exit(0);
}

const subscribers = await listRes.json();
if (subscribers.length === 0) {
  console.log("Newsletter: no subscribers, skipping.");
  process.exit(0);
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
});

// This repo's commits ARE its version numbers (see vite.config.js, which
// injects `git log -1 --pretty=%s` as __COMMIT_SUMMARY__ and shows it in the
// Start Menu as "Current version"). So the triggering commit message doubles
// as the version to show subscribers here.
const version = UPDATE_MESSAGE.split("\n")[0].trim().slice(0, 200) || "latest";

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const subject = `Portfolio update: v${version}`;

console.log(`Newsletter: emailing ${subscribers.length} subscriber(s) about v${version}.`);

for (const { email, unsubscribe_token } of subscribers) {
  const unsubscribeUrl = `${SUPABASE_URL}/functions/v1/unsubscribe?token=${unsubscribe_token}`;

  const text = `Hey,

Just pushed an update to my portfolio (v${version}). Figured you'd want to know since you signed up for this.

${SITE_URL}

Rick

--
You're getting this because you subscribed on rickmuda.nl.
Unsubscribe: ${unsubscribeUrl}`;

  const html = `
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Hey,</p>
  <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
    Just pushed an update to my portfolio. Figured you'd want to know since you signed up for this.
  </p>
  <div style="display: inline-block; background: #9b20b7; color: #ffffff; font-weight: 700; font-size: 14px; padding: 8px 16px; border-radius: 6px; margin: 0 0 24px;">
    Version ${escapeHtml(version)}
  </div>
  <p style="margin: 0 0 28px;">
    <a href="${SITE_URL}" style="display: inline-block; background: #1a1a24; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 22px; border-radius: 6px;">Check it out</a>
  </p>
  <p style="font-size: 15px; line-height: 1.6; margin: 0 0 28px;">Rick</p>
  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 0 0 16px;" />
  <p style="font-size: 12px; color: #888888; line-height: 1.5; margin: 0;">
    You're getting this because you subscribed on rickmuda.nl.
    <a href="${unsubscribeUrl}" style="color: #888888;">Unsubscribe</a>
  </p>
</div>`;

  try {
    await transporter.sendMail({
      from: `"Rick Muda Portfolio" <${GMAIL_USER}>`,
      to: email,
      subject,
      text,
      html,
    });
    console.log(`Newsletter: sent to ${email}`);
  } catch (err) {
    console.error(`Newsletter: failed to send to ${email}`, err.message);
  }
  // Small gap between sends so a burst of subscribers doesn't look like spam to Gmail.
  await new Promise((r) => setTimeout(r, 300));
}
