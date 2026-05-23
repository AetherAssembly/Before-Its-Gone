# SMTP Configuration Guide

Before It's Gone can send email notifications through any SMTP server. This guide covers settings for common providers and explains how to diagnose connection problems.

> **Note on IMAP:** The app only *sends* email (SMTP). It does not read inboxes and does not use IMAP. If you want to receive notifications in a specific folder, configure filtering rules in your email client.

---

## Quick-reference: common providers

| Provider | Host | Port | TLS | Auth |
| -------- | ---- | ---- | --- | ---- |
| Gmail | `smtp.gmail.com` | 587 | On (STARTTLS) | App password |
| Outlook / Hotmail | `smtp-mail.outlook.com` | 587 | On (STARTTLS) | Account password |
| Microsoft 365 | `smtp.office365.com` | 587 | On (STARTTLS) | Account password |
| Fastmail | `smtp.fastmail.com` | 587 | On (STARTTLS) | App password |
| Yahoo Mail | `smtp.mail.yahoo.com` | 587 | On (STARTTLS) | App password |
| iCloud Mail | `smtp.mail.me.com` | 587 | On (STARTTLS) | App-specific password |
| Proton Mail Bridge | `127.0.0.1` | 1025 | Off | Bridge password |
| Custom / self-hosted | your server | 25 / 587 / 465 | Varies | Varies |

---

## Port guide

| Port | Protocol | When to use |
| ---- | -------- | ---------- |
| 25 | SMTP plain | Server-to-server relay; usually blocked by ISPs for end-user clients |
| 587 | SMTP + STARTTLS | **Recommended for user clients.** Starts unencrypted, upgrades to TLS. Enable **Use TLS** in settings. |
| 465 | SMTP over SSL | Legacy but still common. Encrypted from the first byte. Enable **Use TLS** in settings. |

If you are unsure, try port 587 with **Use TLS** on first.

---

## Provider-specific setup

### Gmail

Google does not allow SMTP access with your regular login password. You must generate an **App Password**.

**Requirements:** Gmail account with 2-Step Verification enabled.

1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
2. Click **Create app password**, enter a name (e.g. "Before It's Gone"), and click **Create**.
3. Copy the 16-character password shown.

**Settings:**

| Field | Value |
| ----- | ----- |
| SMTP host | `smtp.gmail.com` |
| SMTP port | `587` |
| Username | your full Gmail address (`you@gmail.com`) |
| Password | the 16-character app password (not your login password) |
| Use TLS | On |

> If you see "Username and Password not accepted", double-check that you are using the app password, not your Gmail login password. App passwords are only shown once — generate a new one if you lose it.

---

### Outlook / Hotmail / Live

**Settings:**

| Field | Value |
| ----- | ----- |
| SMTP host | `smtp-mail.outlook.com` |
| SMTP port | `587` |
| Username | your full Outlook address (`you@outlook.com`) |
| Password | your Microsoft account password |
| Use TLS | On |

> Microsoft 365 organizational accounts may require OAuth2 or per-app SMTP settings configured by your IT admin. Check with your administrator if standard SMTP authentication fails.

---

### Fastmail

Fastmail requires an **App Password** for SMTP access.

1. Go to **Settings → Privacy & Security → Third-party apps / integrations → New App Password**.
2. Name it (e.g. "Before It's Gone"), select *Email* access, and generate.
3. Copy the password.

**Settings:**

| Field | Value |
| ----- | ----- |
| SMTP host | `smtp.fastmail.com` |
| SMTP port | `587` |
| Username | your full Fastmail address |
| Password | the app password |
| Use TLS | On |

---

### Yahoo Mail

Yahoo requires an **App Password** (your account password will not work).

1. Go to **Account Security** in your Yahoo account settings.
2. Turn on **2-Step Verification** if not already enabled.
3. Scroll to **App passwords** → **Generate app password**, select *Other app*, name it, and generate.
4. Copy the password.

**Settings:**

| Field | Value |
| ----- | ----- |
| SMTP host | `smtp.mail.yahoo.com` |
| SMTP port | `587` |
| Username | your full Yahoo address |
| Password | the app password |
| Use TLS | On |

---

### iCloud Mail

Apple requires an **app-specific password** for third-party SMTP clients.

1. Go to [appleid.apple.com](https://appleid.apple.com) → **Sign-In and Security → App-Specific Passwords → Generate an app-specific password**.
2. Name it and copy the password.

**Settings:**

| Field | Value |
| ----- | ----- |
| SMTP host | `smtp.mail.me.com` |
| SMTP port | `587` |
| Username | your full iCloud address (`you@icloud.com`) |
| Password | the app-specific password |
| Use TLS | On |

---

### Proton Mail (via Bridge)

Proton Mail's SMTP access requires the [Proton Mail Bridge](https://proton.me/mail/bridge) desktop app to be running alongside Before It's Gone. The Bridge decrypts mail locally and exposes a standard SMTP endpoint.

1. Install and run Proton Mail Bridge.
2. Sign in with your Proton account inside Bridge.
3. Find the local SMTP credentials in the Bridge UI.

**Settings:**

| Field | Value |
| ----- | ----- |
| SMTP host | `127.0.0.1` |
| SMTP port | `1025` (or as shown in Bridge) |
| Username | your Proton address (as shown in Bridge) |
| Password | the Bridge-generated password (not your Proton login) |
| Use TLS | Off (Bridge handles encryption internally) |

---

### Self-hosted (Postfix / Sendmail / Mailcow / etc.)

Settings vary by server configuration. Common setups:

| Configuration | Host | Port | TLS | Auth |
| ------------- | ---- | ---- | --- | ---- |
| Local relay (no auth) | `localhost` or `127.0.0.1` | `25` or `587` | Off | Leave username/password blank |
| Authenticated submission | your server's hostname | `587` or `465` | On | Your mail user credentials |

If your server uses a self-signed certificate, TLS negotiation may fail. In that case:

- Use port 587 with TLS off (STARTTLS without certificate verification) — note this is only acceptable for local/private networks.
- Or configure your server with a valid certificate (Let's Encrypt recommended).

---

## Troubleshooting

### "Connection refused" or timeout

- Verify the host and port are correct.
- Check that your mail server allows SMTP connections from your machine (firewall rules, ISP blocking of port 25).
- For self-hosted servers, confirm the SMTP daemon is running (`systemctl status postfix` etc.).

### "Authentication failed" or "535"

- Wrong password. For Gmail, Yahoo, Fastmail, and iCloud — you must use an **app password**, not your login password.
- Your account may require 2-factor authentication to be enabled before app passwords are available.
- Username must be your full email address, not just the local part (e.g. `you@gmail.com`, not `you`).

### "Certificate error" or TLS handshake failure

- Your server's certificate may be expired or self-signed.
- Try disabling **Use TLS** if you are connecting to a local trusted server.
- For public servers, ensure the host matches the certificate's common name exactly.

### Emails arrive in spam

- The sender address used by the app (`notifications@beforeitsgone.local`) has no associated domain record, which may trigger spam filters.
- Configure SPF/DKIM records if you control the sending domain, or use Resend which handles deliverability automatically.
- Whitelist the sender address in your email client.

### Test email works but digests don't arrive

- Confirm the **Digest frequency** is set to Daily or Weekly (not Never).
- The digest fires at the configured **Send time** only if the app is running and the system clock reaches that time.
- The digest does not fire if all items are fresh and no items are low-stock — nothing is sent when there is nothing to report.
