# Hacking

This document lists a couple of useful information for development and deployment purpose.

## Table of content

- [Deployment](#deployment)
- [Internationalization](#internationalization)
- [Faucets](#faucets)
- [Testing](#testing)

## Deployment

Following terminal commands are useful to deploy `frontend` and `backend`.

### Local development

> To perform local development, you'll need a `.env.development` file.

```bash
npm run deploy
```

### Staging

> To perform staging development, you'll need a `.env.staging` file.

```bash
ENV=staging dfx deploy frontend --network staging --wallet cvthj-wyaaa-aaaad-aaaaq-cai
ENV=staging ./scripts/deploy.backend.sh
```

### IC

> To perform production development, you'll need a `.env.production` file.

```bash
ENV=ic dfx deploy frontend --network ic --wallet yit3i-lyaaa-aaaan-qeavq-cai
ENV=ic ./scripts/deploy.backend.sh
```

## Internationalization

Translations are handled in JSON file - for example [en.json](src/frontend/src/lib/i18n/en.json). We selected this format because they can easily be edited by third parties even without developer skills.

To add support for an additional language, proceed as following:

> Note that Oisy's repo **does not** accept external contributions yet.

1. Copy `en.json` to a new filename reflecting the language ISO code (such as for example `zh-cn.json` for simplified Chinese).
2. Translate each key of the newly created file.
3. Replace the file imported in [i18n.store.ts](src/frontend/src/lib/stores/i18n.store.ts).

In the future, Oisy might be extended to support multiple languages on production.

### Adding additional keys

Translations are handled in JSON files but, as we are consuming these through a store, their representation have to exist as interfaces. To ease the process we have developed a script which extracts the declarations automatically. In case you would add new keys, `run npm run i18n` to generate the interfaces.

## Faucets

A list of useful faucets and ERC20 tokens on Sepolia:

- ETH: [Ethereum Sepolia Faucet](https://www.alchemy.com/faucets/ethereum-sepolia) from Alchemy
- USDC: [Circle faucet](https://faucet.circle.com/)
- ERC20: [Weenus 💪 Token Faucet](https://github.com/bokkypoobah/WeenusTokenFaucet)

## Testing

This section provides information about testing procedures.

### E2E visual comparisons

To implement a test that compares snapshots, follow these steps:

1. Add an e2e test in the `./e2e` directory.
2. Implement the test using `await expect(page).toHaveScreenshot()` to compare screenshots.
3. Run the e2e test locally using `npm run e2e:snapshots` to generate the screenshots.
4. Run the e2e test locally again using `npm run e2e` to validate the test.
5. Add the generated screenshots to Git.
6. Create a PR for your changes.
7. Open the GitHub Actions page and navigate to [Update E2E snapshots](https://github.com/dfinity/oisy-wallet/actions/workflows/update-snapshots.yml).
8. Manually trigger the generation of screenshots for the CI by running the workflow using your PR or branch.

This last step will generate the screenshots for the CI and add them to your PR. You can trigger this job again anytime you make changes, regardless of whether the test itself changes.

#### Notes

- We develop on macOS, while GitHub Actions use Linux. Therefore, there are two sets of screenshots: `darwin` for macOS and `linux` for Linux.
- For more information, refer to the Playwright [documentation](https://playwright.dev/docs/test-snapshots).

// TODO: remove comment
