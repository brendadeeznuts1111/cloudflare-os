# Deploy gate

This checkout is **not** ready for `pnpm deploy`. Production deploy is blocked until Cloudflare credentials and `deployment.jsonc` are filled.

## Why deploy is gated

`deployment.jsonc` still contains placeholders:

| Field | Placeholder |
| --- | --- |
| `accountId` | `<CLOUDFLARE_ACCOUNT_ID>` |
| `workers.router.name` | `<ROUTER_WORKER_NAME>` |
| `workers.workshop.name` | `<WORKSHOP_WORKER_NAME>` |
| `workers.context.name` | `<CONTEXT_WORKER_NAME>` |
| `workers.scheduler.name` | `<SCHEDULER_WORKER_NAME>` |
| `workers.customGatekeeper.name` | `<CUSTOM_GATEKEEPER_WORKER_NAME>` |
| `workers.errorReporter.name` | `<ERROR_REPORTER_WORKER_NAME>` |
| `access.issuer` | `https://<TEAM_NAME>.cloudflareaccess.com` |
| `access.audience` | `<ACCESS_AUDIENCE>` |
| `access.admins` | `<ADMIN_EMAIL>` |
| `customGatekeeper.name` | `<ORGANIZATION_DISPLAY_NAME>` |
| `customGatekeeper.message` | `<ORGANIZATION_GUIDANCE>` |

This environment also has no `wrangler login` session. Do not run `pnpm deploy` until both of those are true.

## Cloudflare account requirements

The account needs:

- [Workers](https://developers.cloudflare.com/workers/)
- [KV](https://developers.cloudflare.com/kv/)
- [R2](https://developers.cloudflare.com/r2/)
- [Browser Rendering](https://developers.cloudflare.com/browser-rendering/)
- [Dynamic Worker Loaders](https://developers.cloudflare.com/workers/runtime-apis/bindings/worker-loader/)
- [Workers AI](https://developers.cloudflare.com/workers-ai/) and [AI Gateway](https://developers.cloudflare.com/ai-gateway/) (default model catalog)
- [Artifacts](https://developers.cloudflare.com/artifacts/) (optional, for Git-backed Context collections)

## Remaining steps

1. Find the account ID: https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/
2. Choose unique Worker names in the account.
3. Either:
   - Production: pick a hostname in an active zone (for example `os.example.com`) and create a [self-hosted Access application](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/). Copy the [AUD tag](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/#get-your-aud-tag).
   - Evaluation: set `"route": { "workersDev": true }` on the router and set `publicBaseUrl` to `https://<router-name>.<subdomain>.workers.dev`.
4. Replace every placeholder in `deployment.jsonc`.
5. `pnpm exec wrangler login`
6. `pnpm check` then `pnpm deploy`
7. Open `/admin` and set site name, logo, accent color, and which Gatekeepers are enabled.

## Faster path without this repo

[os.cloudflare.app/deploy](https://os.cloudflare.app/deploy) deploys the same upstream release to your account with Access and admin email configured for you. Come back to this repository for custom Gatekeepers, a custom domain, or a pinned upgrade. If you start hosted, eject with [docs/migrate-from-hosted.md](docs/migrate-from-hosted.md).
