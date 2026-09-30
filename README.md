# am-motors-storefront

Inventory-first dealership storefront for AM Motors (UAE).

Status: Phase 2 (Google Sheets adapter). Without server env configuration the site shows a
truthful "inventory temporarily unavailable" state. Access setup:
[`docs/google-sheets-setup.md`](docs/google-sheets-setup.md). Production deployment is not
allowed yet.

```bash
npm ci
npm run dev      # http://localhost:3000
npm run verify   # lint → typecheck → test → build
npm run smoke:sheets  # read-only live Sheet check (needs .env.local)
```

- Project instructions for Claude Code: [`CLAUDE.md`](CLAUDE.md)
- Project skills: [`.claude/skills/`](.claude/skills/)
- Product brief, business rules, UX benchmark, implementation plan: [`docs/`](docs/)
