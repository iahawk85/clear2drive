# Deployment

Target repository: https://github.com/iahawk85/clear2drive

Target domain: https://clear2drive.pwatrm.com

The root Dockerfile builds the static app with Node 24 and serves it using nginx on port 80. No application secrets, database, persistent server volume or personal-data API are required. Browser storage remains local to each user.

Coolify: create an application from the repository's `main` branch, choose the Dockerfile build pack, root build context, Dockerfile `/Dockerfile`, exposed container port `80`, and domain `https://clear2drive.pwatrm.com`. Configure the healthcheck at `/health` and HTTPS with automatic certificate issuance. DNS must point the subdomain to the deployment server (or an existing wildcard must cover it). Deploy only after the build, unit and browser checks pass.

For updates, deploy new commits from main. The service worker exposes an update prompt; acceptance reloads the saved session using the new precache. HTML and sw.js require revalidation; hashed assets may be cached long-term. No HTTP/API responses containing personal data exist.

After deployment, verify secure context, valid manifest and icons, registration and active service worker, installation, offline reload and calculation, no console errors, and the domain's HTTPS certificate. Test personal data locally in a disposable browser context; never send it to the server.
