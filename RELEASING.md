# Controlled promotion and rollback

All product development stays in Grok Lab. Do not merge divergent feature branches between repositories. This N0 authorizes only the initial release; every later promotion requires the owner's explicit consent.

## Future release

1. Obtain owner acceptance of one full 40-character staging main SHA. Record that SHA and its successful CI and staging Pages runs. Never silently substitute HEAD.
2. Fetch upstream at exactly that SHA into a temporary clone. Review source for placeholders, sensitive files and credentials before export.
3. Create a release branch in netops. Export the pinned upstream snapshot using git archive, excluding generated assets/, all .env files and upstream .github/workflows/. Preserve production release documents and workflow. Remove obsolete imported paths using the previous release/source-files.json inventory. Do not merge feature branches.
4. Regenerate release/source-files.json from git ls-tree of the accepted SHA for all imported files, preserving exact bytes. Update source SHA in RELEASE_SOURCE.md and the release metadata step in deploy.yml. Retain the explicit production build flag --base=/netops/. Review upstream CI for any changed required checks.
5. Open a production release PR. Compare every imported blob with the pinned source inventory; inspect the complete diff and only allow necessary release differences. Require all CI checks and the owner's release decision before merging.
6. Merge into main. The workflow builds and deploys only main; PRs only validate. Inspect the matching successful build and Pages deployment, then check release.json's source and production SHA.
7. Smoke-test https://apotet.github.io/netops/ at desktop 1440 and mobile 390: navigation, question bank, exam completion/explanations, L1 images, Knowledge Base/TLS-SNI, three CLI Lab scenarios, Practice and IPv4. Check resource HTTP statuses and browser errors; report existing product bugs without fixing them in production.
8. After successful smoke and owner authorization, create the agreed release tag at the exact deployed commit and a GitHub Release with source/production SHA, build configuration, CI/Pages run URL, smoke results and limitations. The initial N0 tag alone is automated by the initial-release commit marker.

## Rollback without force push

1. Identify a previously verified release tag and its source and production SHA.
2. Open a revert PR for the faulty promotion, or a PR restoring the known release snapshot plus its inventory and release configuration. Preserve release process files as appropriate and document the target tag.
3. Run CI, obtain the owner's rollback decision, merge into main and verify Pages and release.json followed by the same browser smoke.
4. Tag the rollback commit as a new release. Do not move old tags or force-push main.
5. There is no earlier NetOps production release before N0. If this first release fails smoke, report the failure and withhold acceptance; a rollback cannot invent an earlier known-good release.
