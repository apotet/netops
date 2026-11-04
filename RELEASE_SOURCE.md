# NetOps production release — N0

- Upstream: https://github.com/apotet/my-gemini-mirror-site
- Source SHA: `09c715ed1780d56374498df9a6b393f47bca4202`
- Initial release date: 2026-11-04
- Initial tag: `v1.0.0-n0`
- Production SHA: resolve the release tag's commit; the deployed exact SHA is also recorded in [/netops/release.json](https://apotet.github.io/netops/release.json) and the matching Actions run. This avoids a self-referential commit hash.
- Build: Node 22, locked `npm ci --no-fund --no-audit`, `npm run build -- --base=/netops/`.
- Product files: 70 exact upstream blobs listed in `release/source-files.json`. CI verifies every Git blob hash before building.
- Export exclusions: upstream generated `assets/`, `.env.example`, and upstream `.github/workflows/`. No environment files, dependencies or private roadmap are exported.
- Production-only additions: this manifest, release procedure, source blob inventory and release workflow. No application source or Vite configuration changes.
- Upstream Vite default remains `/my-gemini-mirror-site/`; production overrides base using the Vite CLI flag on every build.
- Existing external photographs, credits and lesson images still use the public legacy repository URLs, exactly as upstream. External availability is a release limitation.

## Validation

The release workflow runs snapshot integrity, placeholder/credential-pattern screening, question validation, explanation coverage, quiz logic tests, TypeScript checks and the production build. It checks emitted HTML entry assets under `/netops/` and uploads coverage evidence. Deployment depends on all checks passing; only pushes to main can deploy. Pull requests run CI without deployment.

Source CI: https://github.com/apotet/my-gemini-mirror-site/actions/runs/41408958773
Source Pages: https://github.com/apotet/my-gemini-mirror-site/actions/runs/41408958855
Production evidence: https://github.com/apotet/netops/actions
Production browser smoke results must be reported separately after publication; a green build is not proof of browser behavior.

See [RELEASING.md](RELEASING.md) for promotion and rollback.
