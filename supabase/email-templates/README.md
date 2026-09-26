# Selectorial Auth Email Templates

These templates are configured for local Supabase development in `supabase/config.toml`:

- `confirm-signup.html`
- `reset-password.html`
- `password-changed.html`

They state a one-hour validity period, matching `auth.email.otp_expiry = 3600` in `supabase/config.toml`. Update the text if the production Auth OTP expiry is configured differently.

For the hosted project **without** a Send Email hook, paste each file into Supabase Dashboard → Authentication → Email Templates. Enable the Password changed notification and set the matching subjects from `supabase/config.toml`.

The confirmation and recovery templates use `{{ .RedirectTo }}`, `{{ .TokenHash }}`, and the application callback route. Keep `/auth/callback` in the Supabase Redirect URLs allow list for localhost and the production domain.

## Resend Send Email Hook (recommended)

Supabase's built-in email provider is heavily rate-limited (you'll see `email rate limit exceeded`). Use the `send-email` Edge Function with Resend instead.

### 1. Resend

1. Create an API key at [resend.com](https://resend.com).
2. For production, verify your domain and set a from address like `Selectorial <noreply@yourdomain.com>`.
3. Until the domain is verified, use `Selectorial <onboarding@resend.dev>` (can only send to your Resend account email).

### 2. Deploy the Edge Function

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set RESEND_FROM_EMAIL="Selectorial <onboarding@resend.dev>"
supabase functions deploy send-email --no-verify-jwt
```

`--no-verify-jwt` is required: Auth Hooks authenticate with the Standard Webhooks secret, not a user JWT.

### 3. Enable the hook in Supabase Dashboard

1. Open **Authentication → Hooks → Send Email**.
2. Choose **HTTPS**.
3. URL: `https://<project-ref>.supabase.co/functions/v1/send-email`
4. Click **Generate secret**, copy the full value (`v1,whsec_...`).
5. Save the hook.

Then store that secret on the function:

```bash
supabase secrets set SEND_EMAIL_HOOK_SECRET="v1,whsec_..."
```

Redeploy if the function was already running before the secret was set:

```bash
supabase functions deploy send-email --no-verify-jwt
```

Once the hook is enabled, Auth uses Resend for confirmation, recovery, and related emails. Built-in SMTP rate limits no longer apply to those sends.
