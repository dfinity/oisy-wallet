# Hacking

This document lists a couple of useful information for development and deployment purpose.

## Table of content

- [Deployment](#deployment)
- [Internationalization](#internationalization)
- [Faucets](#faucets)
- [Testing](#testing)
- [Integrate ckERC20 Tokens](#integrate-ckerc20-tokens)

## Deployment

Following terminal commands are useful to deploy `frontend` and `backend`.

### Local development

> To perform local development, you'll need a `.env.development` file.

```bash
npm run deploy
```

> [!NOTE]
> For macOS, you might need to manually install `llvm` and patch `clang` lib path. See example for `zsh` shell:

```bash
brew install llvm

echo 'export CC=$(brew --prefix llvm)/bin/clang' >> ~/.zshrc
echo 'export AR=$(brew --prefix llvm)/bin/llvm-ar' >> ~/.zshrc
echo 'export PATH=$(brew --prefix llvm)/bin:$PATH' >> ~/.zshrc
```

### Staging

> To perform staging development, you'll need a `.env.staging` file.

```bash
ENV=staging dfx deploy frontend --network staging --wallet cvthj-wyaaa-aaaad-aaaaq-cai
ENV=staging ./scripts/deploy.backend.sh
```

### Beta

> To perform staging development, you'll need a `.env.beta` file.
> Note that beta frontend points to production (IC) backend.

```bash
ENV=beta dfx deploy frontend --network beta --wallet yit3i-lyaaa-aaaan-qeavq-cai
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
- ckERC20:
  - USDC: [Circle faucet](https://faucet.circle.com/)
  - LINK: [Chainlink Sepolia faucet](https://faucets.chain.link/sepolia)
- ERC20: [Weenus 💪 Token Faucet](https://github.com/bokkypoobah/WeenusTokenFaucet)
- Bitcoin: [Coinfaucet](https://coinfaucet.eu/en/btc-testnet/)

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

## Integrate ckERC20 Tokens

While the weekly GitHub Action that runs the job [./scripts/build.tokens.ckerc20.mjs] helps discover new ckERC20 tokens deployed on the IC mainnet for testnet purposes or through proposals for effective production usage, some manual steps are still required to integrate them within Oisy.

The steps are as follows:

1. **Collect the Ethereum logo** for the specific token as an SVG, ideally from an official source. Ensure using the logo in Oisy respects brand/trade guidelines.
2. **Verify the SVG asset size** is acceptable (small) and **copy** it into [src/frontend/src/icp-eth/assets].
3. Create a new source environment file in [src/frontend/src/env] by cloning [src/frontend/src/env/tokens.usdc.env.ts] and renaming `usdc` to the token's name.
4. **Adapt the content of the tokens:**
   1. Find the contract address on the ckETH dashboard [production](https://sv3dd-oaaaa-aaaar-qacoa-cai.raw.icp0.io/dashboard) or [testnet](https://jzenf-aiaaa-aaaar-qaa7q-cai.raw.icp0.io/dashboard) in the table "Supported ckERC20 tokens".
   2. Obtain the token name, decimals, and symbol on Etherscan using the contract address (Select "Contract > Read contract" to query various information from the ABI).
5. **Set up the token** for the Ethereum network by listing the new token in the twin tokens arrays of [src/frontend/src/env/tokens.erc20.env.ts].
6. **Create the mapping for the new token** in [src/frontend/src/env/networks.icrc.env.ts]. This step sets up the token as a ck token, statically establishes the link between the token on the Ethereum network and its twin token on the IC network, and lists the token in the ICRC tokens and ledgers.

Note that setting up the twin token counterpart or collecting their logo is unnecessary. This information is automatically fetched at runtime from the ckETH orchestrator and the related ledger.

To help with steps 3 to 5, one can use the script [./scripts/add.tokens.erc20.mjs] (or [./scripts/add.tokens.erc20.sh]) to generate the environment files for the new tokens. It requires the EtherScan API key to fetch the token information from the Ethereum network, to be set in the `.env` file as `VITE_ETHERSCAN_API_KEY`.
The script will run through the supported ckERC20 tokens in the production dashboard and will automatically generate the necessary environment files for the new tokens that have a respective testnet token, and that do not yet exist in the repository.
Please be aware of the instructions provided by the script and follow them accordingly, if there are any, and possibly double-check the generated files.
