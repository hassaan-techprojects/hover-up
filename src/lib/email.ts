import nodemailer from "nodemailer";

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\\s/g, "");
  if (!user || !appPassword) {
    throw new Error("Gmail SMTP is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: appPassword },
  });
}

export async function sendOtpEmail({ to, code, purpose }: { to: string; code: string; purpose: "SIGNUP" | "PASSWORD_RESET" }) {
  const from = process.env.GMAIL_FROM || process.env.GMAIL_USER;
  const isSignup = purpose === "SIGNUP";
  const title = isSignup ? "Verify your Hover Up account" : "Reset your Hover Up password";
  const intro = isSignup
    ? "Use this one-time password to verify your email address and finish creating your Hover Up account."
    : "Use this one-time password to verify your identity and continue resetting your Hover Up password.";

  await getTransporter().sendMail({
    from: { name: "Hover Up", address: from! },
    to,
    subject: title,
    text: `Your Hover Up verification code is ${code}. It expires in 10 minutes. If you did not request this, you can safely ignore this email.`,
    html: `<!doctype html><html><body style="margin:0;background:#faf9f7;padding:32px 16px;font-family:Arial,sans-serif;color:#171717"><div style="max-width:520px;margin:auto;background:#fff;border:1px solid #e9e4dc;border-radius:18px;padding:36px"><p style="font-size:12px;letter-spacing:4px;color:#a18c75;font-weight:700">HOVER UP</p><h1 style="font-size:25px;margin:24px 0 12px">${title}</h1><p style="font-size:14px;line-height:1.7;color:#666">${intro}</p><div style="margin:28px 0;padding:20px;background:#faf9f7;border:1px solid #e9e4dc;border-radius:12px;text-align:center;font-size:32px;letter-spacing:10px;font-weight:700">${code}</div><p style="font-size:12px;color:#888;line-height:1.6">This code expires in 10 minutes. Never share it with anyone, including Hover Up support.</p></div></body></html>`,
  });
}
