# Email Notifications

Before It's Gone can send expiry alerts and inventory digests to any email address using either **Resend** (recommended) or your own **SMTP server**.

Email notifications are only available in the **desktop (Electron) app**. They are not available in the web-only build.

---

## Setup

Open the app and go to **Settings → Email Notifications**.

### 1. Choose a provider

| Provider | Best for |
| -------- | -------- |
| **Resend** | Easiest setup — one API key, reliable delivery |
| **SMTP** | Self-hosted mail servers, Gmail SMTP, Fastmail, etc. |

### 2. Configure credentials

#### Resend

1. Create a free account at [resend.com](https://resend.com).
2. Generate an API key in your Resend dashboard (Resend → API Keys → Create API Key).
3. Paste the key (starts with `re_`) into **Resend API key** in Settings.

#### SMTP

Fill in the fields that match your mail server:

| Field | Example |
| ----- | ------- |
| SMTP host | `smtp.gmail.com` |
| SMTP port | `587` (STARTTLS) or `465` (SSL) |
| Username | `you@gmail.com` |
| Password | App password (not your login password) |
| Use TLS | On for port 587/465, off for local servers on port 25 |

> **Gmail users:** Enable 2-factor authentication on your Google account, then generate an [App Password](https://myaccount.google.com/apppasswords) to use here. Your regular Gmail password will not work.

### 3. Set a recipient

Enter the email address that should receive notifications in the **Recipient email** field.

### 4. Configure digest

| Setting | Description |
| ------- | ----------- |
| **Never** | No automatic digest emails. Desktop notifications for expiring, expired, and low-stock items still fire as normal. |
| **Daily** | One email per day at the chosen time. |
| **Weekly** | One email per week (sent at least 6.5 days after the last digest). |
| **Send time** | Time of day to send the digest (24-hour, e.g. `08:00`). |

### 5. Test

Click **Send test email** to verify your credentials before relying on them. A plain test message will be sent to the configured recipient address.

---

## Digest content

A digest email includes:

- **Expiring items** — items within your configured warning window (amber) or already expired (red), with expiry date, quantity, and location
- **Low stock** — items at or below their low-stock threshold, with quantity and threshold

If nothing is expiring or low, no digest is sent for that cycle.

---

## Pause and snooze

To temporarily stop digest emails, use the **Pause emails** controls:

| Option | Effect |
| ------ | ------ |
| **7 days** | Resumes automatically after 7 days |
| **30 days** | Resumes automatically after 30 days |
| **Indefinitely** | Stays paused until you click Resume in Settings |

A banner in the app header shows when emails are paused.

---

## Credential storage

Email credentials (API key or SMTP password) are stored in `email-settings.json` inside Electron's `userData` directory — **not** in the browser's localStorage or IndexedDB, and not synced to any cloud. The file is readable only by your user account.

Typical paths:

| Platform | Path |
| -------- | ---- |
| Linux | `~/.config/before-its-gone/email-settings.json` |
| macOS | `~/Library/Application Support/before-its-gone/email-settings.json` |
| Windows | `%APPDATA%\before-its-gone\email-settings.json` |
