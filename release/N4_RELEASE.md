# NetOps production release — N4 (2026-11-13)

- Source: apotet/my-gemini-mirror-site@fd98446c04ce37895707cf62d2afec0cd62ff6a6
- Scope: accepted staging updates including CLI F1–F6 (PR #107/#108), lessons and question bank.
- Upstream code changes copied by exact Git blob content; release/source-files.json pins 181 file SHAs.
- Production App.tsx and production CI/Pages workflow intentionally preserved; mock practice excluded.
- Previous production commit: 2114103fda855f2ddf1b3aaa3820eaed38ccf3db
- Rollback branch: backup/netops-before-n4-20261113
- Production build must pass Node 22 / npm ci / Vite --base=/netops/ and release SHA checks.
- Browser smoke and live release.json must be checked after deployment.
