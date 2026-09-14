# Selectorial Auth Email Templates

These templates are configured for local Supabase development in `supabase/config.toml`:

- `confirm-signup.html`
- `reset-password.html`
- `password-changed.html`

They state a one-hour validity period, matching `auth.email.otp_expiry = 3600` in `supabase/config.toml`. Update the text if the production Auth OTP expiry is configured differently.

For the hosted project, paste each file into Supabase Dashboard → Authentication → Email Templates. Enable the Password changed notification and set the matching subjects from `supabase/config.toml`.

The confirmation and recovery templates use `{{ .RedirectTo }}`, `{{ .TokenHash }}`, and the application callback route. Keep `/auth/callback` in the Supabase Redirect URLs allow list for localhost and the production domain.
