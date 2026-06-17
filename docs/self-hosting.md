# Self-Hosting Before It's Gone

Before It's Gone can be self-hosted as a Progressive Web App (PWA) using Docker and nginx. This guide covers getting it running on your own server or homelab.

## Requirements

- Docker and Docker Compose
- A domain or local hostname (recommended for HTTPS)
- Optional: Tailscale for private HTTPS without exposing ports

## Quick Start

Clone the repo and navigate to the `docker/` directory:

```bash
git clone https://github.com/AetherAssembly/Before-Its-Gone.git
cd Before-Its-Gone
```

Build and start the container:

```bash
docker compose -f docker/docker-compose.yml up -d
```

The app will be available at `http://localhost` by default.

## Configuration

The nginx config is located at `docker/nginx.conf`. You can edit it to change the listening port, add a custom domain, or configure HTTPS.

To change the port, update the `ports` field in `docker/docker-compose.yml`:

```yaml
ports:
  - "8080:80"
```

## HTTPS with Tailscale

If you're using Tailscale, you can serve the app over HTTPS on your tailnet without opening any public ports:

1. Enable HTTPS in your Tailscale admin console for your machine.
2. Point nginx at your Tailscale hostname.
3. Update `nginx.conf` to listen on port 443 and reference your Tailscale cert paths (usually under `/var/lib/tailscale/certs/`).

## Updating

Pull the latest changes and rebuild:

```bash
git pull
docker compose -f docker/docker-compose.yml up -d --build
```

## PWA Install

Once running over HTTPS, the app is installable as a PWA from your browser. Look for the install prompt in the address bar or browser menu.
