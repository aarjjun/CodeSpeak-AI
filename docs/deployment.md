# Marketplace deployment runbook

## Release prerequisites

Before the first public release, the owner must finalize:

- The Visual Studio Marketplace publisher ID is `arjunanoop`; confirm that the project owner retains access to this publisher.
- The public repository, homepage, and issue tracker are declared in `package.json`.
- Whether the proprietary `LICENSE.txt` should remain or be replaced with an approved open-source/commercial license.
- Marketplace privacy-policy and support URLs if required by the publisher account.
- Automated publishing identity. Prefer Microsoft Entra ID for new automation; Microsoft has announced retirement of global Azure DevOps PATs on December 1, 2026.

Do not publish until these ownership and legal values are confirmed. They are intentionally not invented in the source manifest.

## Local release verification

Use Node.js 22 and a clean checkout:

```sh
npm ci
npm run release:check
```

`release:check` performs strict compilation, linting, formatting, enforced coverage, dependency audit through CI, minimum-version Extension Host tests, and VSIX packaging.

Inspect the archive before distribution:

```sh
npx vsce ls --tree
```

Confirm that source tests, coverage reports, development scripts, `.vscode-test`, and draft image assets are absent.

## Manual installation test

1. Create the VSIX with `npm run package`.
2. Start a clean VS Code profile running version 1.98.0 or newer.
3. Run **Extensions: Install from VSIX...**.
4. Verify Command Palette navigation with keyboard only.
5. Verify screen-reader announcements.
6. Test missing-key, offline, invalid-response, and cancellation paths.
7. If VS Code Speech is installed, test one utterance and continuous-mode cancellation.
8. Verify Problems diagnostics on a TSX fixture.
9. Uninstall and confirm no workspace files were created.

## Marketplace publishing

After publisher ownership and authentication are configured:

```sh
npx vsce login arjunanoop
npx vsce publish
```

For automated publishing, configure a protected release environment and short-lived Microsoft Entra credentials. Do not store credentials in the repository, package manifest, npm configuration, or extension settings.

## Versioning

- Patch: bug fixes and accessibility refinements without contract changes.
- Minor: new backward-compatible commands, parsers, profiles, or settings.
- Major: breaking command IDs, configuration keys, storage formats, or supported-runtime changes.

Update `package.json`, `CHANGELOG.md`, Marketplace copy, API documentation, and privacy documentation in the same release change.

## Rollback

Prefer unpublishing a faulty version over removing the extension. Marketplace extension names and deleted versions cannot be safely reused. Publish a corrected patch version after the release gates pass.

## Post-release checks

- Install the Marketplace artifact, not the local VSIX.
- Verify icon, banner contrast, commands, settings, README rendering, license, and changelog.
- Confirm the minimum VS Code engine constraint is displayed correctly.
- Monitor accessibility regressions, activation failures, rate-limit behavior, and voice setup failures.
- Never request source code, API keys, or voice recordings in public support threads.
