import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "npm:resend@4.0.0";

const LOGO_URL =
  "https://kckyqlevfxuunblrazxd.supabase.co/storage/v1/object/public/public-assets/selectorial_logo.jpeg";

type EmailActionType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email"
  | "reauthentication"
  | "password_changed_notification"
  | "email_changed_notification"
  | "phone_changed_notification"
  | "identity_linked_notification"
  | "identity_unlinked_notification"
  | "mfa_factor_enrolled_notification"
  | "mfa_factor_unenrolled_notification";

type HookPayload = {
  user: {
    email: string;
    new_email?: string;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: EmailActionType;
    site_url: string;
    token_new: string;
    token_hash_new: string;
  };
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);
const hookSecret = (Deno.env.get("SEND_EMAIL_HOOK_SECRET") as string).replace(
  "v1,whsec_",
  "",
);
const fromEmail =
  Deno.env.get("RESEND_FROM_EMAIL") ?? "Selectorial <onboarding@resend.dev>";

function buildActionLink(
  redirectTo: string,
  tokenHash: string,
  type: string,
): string {
  const url = new URL(redirectTo);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  return url.toString();
}

function emailShell(args: {
  eyebrow: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
  footerNote?: string;
}): string {
  const cta = args.ctaLabel && args.ctaHref
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="border-radius:12px;background:#0f172a;"><a href="${args.ctaHref}" style="display:inline-block;padding:14px 22px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${args.ctaLabel}</a></td></tr></table>`
    : "";

  const footerNote = args.footerNote
    ? `<p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#64748b;">${args.footerNote}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f0f9ff;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f0f9ff;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">
          <tr><td style="padding:32px 36px 24px;background:linear-gradient(135deg,#0ea5e9,#7dd3fc);">
            <img src="${LOGO_URL}" width="144" alt="Selectorial" style="display:block;max-width:144px;height:auto;border:0;border-radius:8px;" />
          </td></tr>
          <tr><td style="padding:36px;">
            <p style="margin:0 0 12px;font-size:14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#0284c7;">${args.eyebrow}</p>
            <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#0f172a;">${args.title}</h1>
            ${args.bodyHtml}
            ${cta}
            ${footerNote}
          </td></tr>
          <tr><td style="padding:20px 36px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.5;color:#94a3b8;">Selectorial · Selective test preparation</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function buildEmail(
  email: string,
  actionType: EmailActionType,
  redirectTo: string,
  tokenHash: string,
  token: string,
): { subject: string; html: string } {
  switch (actionType) {
    case "signup":
    case "invite":
      return {
        subject: "Confirm your Selectorial account",
        html: emailShell({
          eyebrow: "Welcome to Selectorial",
          title: "Confirm your email address",
          bodyHtml:
            `<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#475569;">Thanks for creating your parent account with <strong>${email}</strong>. Confirm your email address to finish setting up your account.</p>`,
          ctaLabel: "Confirm email address",
          ctaHref: buildActionLink(redirectTo, tokenHash, "signup"),
          footerNote:
            "This link is valid for 1 hour. If you did not create a Selectorial account, you can safely ignore this email.",
        }),
      };
    case "recovery":
      return {
        subject: "Reset your Selectorial password",
        html: emailShell({
          eyebrow: "Account security",
          title: "Reset your password",
          bodyHtml:
            `<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#475569;">We received a request to reset the password for <strong>${email}</strong>. Use the secure link below to choose a new password.</p>`,
          ctaLabel: "Reset password",
          ctaHref: buildActionLink(redirectTo, tokenHash, "recovery"),
          footerNote:
            "This link is valid for 1 hour. If you did not request a password reset, you can safely ignore this email.",
        }),
      };
    case "magiclink":
    case "email":
      return {
        subject: "Your Selectorial sign-in link",
        html: emailShell({
          eyebrow: "Sign in",
          title: "Your magic link is ready",
          bodyHtml:
            `<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#475569;">Use the button below to sign in to Selectorial as <strong>${email}</strong>. Or enter this code: <strong>${token}</strong>.</p>`,
          ctaLabel: "Sign in to Selectorial",
          ctaHref: buildActionLink(redirectTo, tokenHash, actionType),
          footerNote: "This link is valid for 1 hour.",
        }),
      };
    case "password_changed_notification":
      return {
        subject: "Your Selectorial password was changed",
        html: emailShell({
          eyebrow: "Security notification",
          title: "Your password was changed",
          bodyHtml:
            `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#475569;">The password for your Selectorial account, <strong>${email}</strong>, was changed successfully.</p><p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">If you made this change, no action is needed. If you did not, reset your password immediately and contact Selectorial support.</p>`,
        }),
      };
    default:
      return {
        subject: "Selectorial account update",
        html: emailShell({
          eyebrow: "Account update",
          title: "Action required",
          bodyHtml:
            `<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#475569;">Use this code for <strong>${email}</strong>: <strong>${token}</strong>.</p>`,
          ctaLabel: "Continue",
          ctaHref: buildActionLink(redirectTo, tokenHash, actionType),
          footerNote: "This link is valid for 1 hour.",
        }),
      };
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("not allowed", { status: 400 });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);
  const wh = new Webhook(hookSecret);

  try {
    const { user, email_data } = wh.verify(payload, headers) as HookPayload;
    const { token, token_hash, redirect_to, email_action_type } = email_data;

    const email = buildEmail(
      user.email,
      email_action_type,
      redirect_to,
      token_hash,
      token,
    );

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [user.email],
      subject: email.subject,
      html: email.html,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("send-email hook failed", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const code =
      typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as { code: unknown }).code === "number"
        ? (error as { code: number }).code
        : 401;

    return new Response(
      JSON.stringify({
        error: {
          http_code: code,
          message,
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
