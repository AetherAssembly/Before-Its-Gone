# Privacy Policy

Last updated: 2026-06-08

## Overview

Before It's Gone is a local-first desktop application for tracking food items, barcodes, and expiry dates. This application is designed to keep your data on your own device.

## Who We Are

Before It's Gone is developed and maintained by [AetherAssembly](https://aetherassembly.org/about). For privacy-related questions, contact us at [support@aetherassembly.org](mailto:support@aetherassembly.org) or via the [contact form](https://forms.gle/T4i7GGzaT3HUrffm9).

## Data We Process

The app may store the following information locally on your device:

- Inventory item names
- Barcode values you enter
- Quantity, location, shelf-life, and expiry information
- Saved barcode profiles used for auto-fill behavior
- Local notification state used to avoid duplicate alerts

This data is stored locally in browser-compatible storage used by the Electron renderer, including IndexedDB and local storage.

## Data We Do Not Intentionally Collect

This project does not include:

- Mandatory user accounts
- Built-in analytics or tracking
- Advertising identifiers
- Remote telemetry sent by the application itself

## Network Requests

The application makes outbound network requests only in the following circumstances:

### Always off by default / user-triggered

| Request | Destination | When |
| ------- | ----------- | ---- |
| Barcode product lookup | [Open Food Facts](https://world.openfoodfacts.org/) | When you scan or look up a barcode |
| Batch barcode enrichment | Open Food Facts | When you import a barcode list file |
| Auto-update check | GitHub Releases | On desktop app startup (packaged builds only) |

### Automatic when 3+ items are expiring (dismissible)

| Request | Destination | Data sent |
| ------- | ----------- | --------- |
| Recipe suggestions | [TheMealDB](https://www.themealdb.com/) | The name of one expiring item as an ingredient query |

### Opt-in only

| Feature | Destination | Data sent |
| ------- | ----------- | --------- |
| Email notifications (Resend) | resend.com | Item names, expiry dates, quantities |
| Email notifications (SMTP) | Your SMTP server | Item names, expiry dates, quantities |
| Cloud sync | Your Supabase project | Your full inventory (all fields) |

All third-party services may receive standard HTTP request metadata (IP address, user agent, request timestamp) according to their own privacy policies.

## Notifications

The app may request permission to display local desktop notifications for items that are expiring soon, already expired, or running low on stock. Notification scheduling state is stored locally on your device.

## Email Credential Storage

If you configure email notifications, your API key or SMTP credentials are stored in `email-settings.json` inside Electron's `userData` directory on your device. They are never transmitted anywhere other than the email provider you configure.

## Cloud Sync

If you enable optional Supabase cloud sync, your inventory data is transmitted to and stored in the Supabase project you configure. AetherAssembly does not operate or have access to your Supabase project. Your Supabase URL and anon key are stored in your device's local browser storage. Sync is disabled by default and requires explicit opt-in.

## Data Sharing

The project does not intentionally sell, rent, or share your local inventory data with third parties.

## Data Retention and Deletion

Your data remains on your device until you remove it in the application or clear the app's local data manually.

Removing the application does not always guarantee deletion of all local data stored in your user profile directories. You are responsible for deleting any remaining local app data if desired.

## Open Source Nature of the Project

Because this project is open source, anyone can inspect the code to verify how data is handled. If you build modified versions yourself or install builds from third parties, their behavior may differ from official AetherAssembly releases.

## Contact

For privacy-related questions, contact AetherAssembly at [support@aetherassembly.org](mailto:support@aetherassembly.org) or via the [contact form](https://forms.gle/T4i7GGzaT3HUrffm9).
