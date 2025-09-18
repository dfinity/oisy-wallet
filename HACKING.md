# Hacking

This document lists a couple of useful information for development and deployment purpose.

## Table of content

- [Deployment](#deployment)
- [Internationalization](#internationalization)
- [Faucets](#faucets)
- [Testing](#testing)
- [Integrate ckERC20 Tokens](#integrate-ckerc20-tokens)
- [Bitcoin](#bitcoin)
- [Routes Styles](#routes-styles)
- [Add EVM Networks](#add-evm-networks)
- [Build Frontend locally with Docker](#build-frontend-locally-with-docker)

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
dfx deploy frontend --network staging --wallet cvthj-wyaaa-aaaad-aaaaq-cai
dfx deploy backend --network staging
```

### Beta

> To perform staging development, you'll need a `.env.beta` file.
> Note that beta frontend points to production (IC) backend.

```bash
dfx deploy frontend --network beta --wallet yit3i-lyaaa-aaaan-qeavq-cai
```

### IC

Ensure that you have [`dfx-orbit`](https://github.com/dfinity/orbit/tree/main/tools/dfx-orbit) installed and are using the correct station:

```
dfx-orbit station show
```

> To perform production development, you'll need a `.env.production` file for the frontend. Then:

```bash
DOCKER_BUILDKIT=1 docker build -f Dockerfile.frontend --progress=plain --build-arg network=ic -o target/ .

dfx-oisy request deploy frontend --network ic --wallet yit3i-lyaaa-aaaan-qeavq-cai
```

For the backend:

```bash
scripts/docker-build

dfx-orbit request canister install backend --mode upgrade --wasm out/backend.wasm.gz --arg-file out/backend.args.did
```

## Internationalization

Translations are handled in JSON file - for example [en.json](src/frontend/src/lib/i18n/en.json). We selected this format because they can easily be edited by third parties even without developer skills.

To add support for an additional language, proceed as following:

> Note that OISY's repo **does not** accept external contributions yet.

1. Copy `en.json` to a new filename reflecting the language ISO code (such as for example `zh-cn.json` for simplified Chinese).
2. Translate each key of the newly created file.
3. Replace the file imported in [i18n.store.ts](src/frontend/src/lib/stores/i18n.store.ts).

In the future, OISY might be extended to support multiple languages on production.

### Adding additional keys

Translations are handled in JSON files but, as we are consuming these through a store, their representation have to exist as interfaces. To ease the process we have developed a script which extracts the declarations automatically. In case you would add new keys, `run npm run i18n` to generate the interfaces.

## Faucets

A list of useful faucets:

- Ethereum and EVM networks:
  - ETH: [Alchemy mixed faucets](https://www.alchemy.com/faucets/)
  - BNB: [BNB Testnet Faucet](https://www.bnbchain.org/en/testnet-faucet)
  - Polygon: [Polygon Testnet Faucet](https://faucet.polygon.technology/)
  - USDC and EURC: [Circle faucet](https://faucet.circle.com/)
  - ERC20: [Weenus 💪 Token Faucet](https://github.com/bokkypoobah/WeenusTokenFaucet)
  - Others:
    - ChainLink: [all faucets](https://faucets.chain.link/)
- Bitcoin: [Coinfaucet](https://coinfaucet.eu/en/btc-testnet/)
- SOL: [Solana Foundation Faucet](https://faucet.solana.com/) or [Sol Faucet](https://solfaucet.com/)
- TESTICP: [TESTICP Faucet](https://nqoci-rqaaa-aaaap-qp53q-cai.icp0.io/)
- TESTICRC1: [TESTICRC1 Faucet](https://pwwqf-yaaaa-aaaap-qp5wq-cai.icp0.io/)

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

While the weekly GitHub Action that runs the job [./scripts/build.tokens.ckerc20.ts] helps discover new ckERC20 tokens deployed on the IC mainnet for testnet purposes or through proposals for effective production usage, some manual steps are still required to integrate them within OISY.

The steps are as follows:

1. **Collect the Ethereum logo** for the specific token as an SVG, ideally from an official source. Ensure using the logo in OISY respects brand/trade guidelines.
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

## Bitcoin

Some setup is necessary to be able to develop locally with Bitcoin tokens.

There are three necessary items before starting to develop locally:

- Environment variables.
- Local Bitcoin node running (regtest).
- Start dfx with bitcoin.

### Bitcoin Environment Variables

The following var should be disabled or completely absent in `.env.development`.

```
VITE_BITCOIN_MAINNET_DISABLED=false    # or remove this line
```

### Bitcoin Development

There are some important notes related to the BTC development:

1. Wallet workers:
   - Locally, only the Regtest network wallet worker is launched
   - On all other ens (staging, beta, prod), we launch Testnet and Mainnet workers
2. Transactions:
   - To test them locally, you need to hardcode a mainnet BTC address with some txs inside. In the future, we plan to create mocks and use them during the local development.
   - Currently, only Mainnet transactions (uncertified) can be loaded on staging/beta/prod, since the Blockchain API we're using to fetch this data doesn't provide txs for testnet.

### Local Bitcoin Node (Or Regtest)

To interact with a Bitcoun network, we can set up a local test node.

The script to set it up and start running it is `./scripts/setup.bitcoin-node.sh`.

The first time you will run it withuot arguments:

```bash
./scripts/setup.bitcoin-node.sh
```

This script will download and set up a local bitcoin node from [Bitcoin.org](https://bitcoin.org/en/download).

Running this script again will start the node without doing the initial setup again.

**Resetting Node:**

It's recommended to reset the node from time to time:

```bash
./scripts/setup.bitcoin-node.sh --reset
```

### Start dfx with Bitcoin

Dfx needs to be aware that a Bitcoin node is running.

There is a script to run dfx with Bitcoin:

```bash
./scripts/dfx.start-with-bitcoin.sh
```

You can also run it by cleaning up the state:

```bash
./scripts/dfx.start-with-bitcoin.sh --clean
```

You would normally do this along resetting the bitcoin node as mentioned before.

**IMPORTANT: If you were running a local replica before without bitcoin, use the `--clean` flag.**

### Mining Bitcoins

To start testing Bitcoin feature you'll need some tokens.

For that, you can get the address of your test user from the UI and get yourlsef some bitcoins:

```bash
./scripts/add.tokens.bitcoin.sh --amount <amount-in-blocks> --address <test-user-address>
```

**One block equals 50 Bitcoin.**

### Mining After Transactions

Tokens transferred are not immediately available in the new destination.

Before they become available, there must be a new block mined. You can mine one:

```bash
./scripts/add.tokens.bitcoin.sh
```

# Routes Styles

The designer, or the foundation, might want to use different background colors for specific routes, such as using white generally speaking in the wallet and light blue on the signer (`/sign`) route.

On the other hand, we want to prerender the background color because, if we don’t, the user will experience a "glitchy" loading effect where the dapp initially loads with a white background before applying the correct color.

That's why, when there is such a specific requests, some CSS can be defined at the route level. CSS which is then prerendered within the generated HTML page at build time.

For example, if I wanted to add a route `/hello` with a red background, we would add the following files in `src`:

```
src/routes/(group)/hello/+page.svelte
src/routes/(group)/hello/+oisy.page.css
```

And in the CSS:

```css
:root {
	background: red;
}
```

Furthermore, given that parsing happens at build time, the developer might want to load the style at runtime for local development purposes. This can be achieved by importing the style in the related `+layout.svelte`:

```javascript
<script lang="ts">
	import { LOCAL } from '$lib/constants/app.constants';

	onMount(async () => {
		if (!LOCAL) {
			return;
		}
		await import('./+oisy.page.css');
	});
</script>
```

## Add EVM Networks

Below a summary of how to add a new EVM network (side-chains or layer-2).

### Pre-requisites

Before starting the integration, ensure the following:

- You have the **Chain ID** for both **mainnet** and any **testnet(s)**.
- The network is supported by key infrastructure providers:
  - [Alchemy](https://www.alchemy.com/)
  - [Infura](https://www.infura.io/)
  - [Etherscan](https://docs.etherscan.io/etherscan-v2)
- The network is already integrated in the [`ethers.js`](https://github.com/ethers-io/ethers.js) library.  
  If not, submit a request to the library maintainers or implement a custom extension as needed.

### Create network object(s)

Location: `src/frontend/src/env/networks/networks-evm/`

#### Steps

- Create a new file: `networks.<network>.env.ts`
- Copy contents from an existing EVM network file (e.g., `networks.bsc.env.ts`)
- Update the following fields:
  - `SYMBOL` – short identifier (e.g., `'BSC'`, `'ARB'`)
  - `NAME` – name of the network
  - `CHAIN ID` - chainId of the network
  - `ICONS` – for all themes &rarr; They should be in SVG format and placed in the `src/frontend/src/lib/assets/networks/{light,dark}` folder.
  - `EXPLORER URL` – to have these values, the `src/frontend/src/env/explorers.env.ts` file should be updated.
  - `PROVIDERS`:
    - `infura`
    - `alchemy`
    - `alchemyJsonRpcUrl`
  - `EXCHANGE` (Coingecko ID) - Update the `CoingeckoPlatformId` type if needed
  - `BUY` (Onramper ID) - Update the `OnramperNetworkId` type if needed

- Add testnet object(s): if there are testnets, create a similar object for each one.

Finally, make sure that the objects `SUPPORTED_<network>_NETWORKS` and `SUPPORTED_<network>_NETWORK_IDS` exist and are accordingly updated, at the end of the file.

For example, this is the mainnet object of `networks.bsc.env.ts`:

```typescript
export const BSC_MAINNET_NETWORK_SYMBOL = 'BSC';

export const BSC_MAINNET_NETWORK_ID: NetworkId = parseNetworkId(BSC_MAINNET_NETWORK_SYMBOL);

export const BSC_MAINNET_NETWORK: EthereumNetwork = {
	id: BSC_MAINNET_NETWORK_ID,
	env: 'mainnet',
	name: 'BNB Smart Chain',
	chainId: 56n,
	iconLight: bscMainnetIconLight,
	iconDark: bscMainnetIconDark,
	explorerUrl: BSC_EXPLORER_URL,
	providers: {
		infura: 'bnb',
		alchemy: 'bnb',
		alchemyJsonRpcUrl: 'https://bnb-mainnet.g.alchemy.com/v2'
	},
	exchange: { coingeckoId: 'binance-smart-chain' },
	buy: { onramperId: 'bsc' }
};
```

### Create native token object(s)

Location: `src/frontend/src/env/tokens/tokens-evm/`

#### Steps:

- Create a new folder: `tokens-<network>`
- Inside the folder, create a new file: `tokens.<token>.env.ts`
- Copy contents from another EVM network’s token file (e.g., `tokens.pol.env.ts`)

  ```typescript
  const POL_DECIMALS = 18;

  const POL_MAINNET_SYMBOL = 'POL';

  export const POL_MAINNET_TOKEN_ID: TokenId = parseTokenId(POL_MAINNET_SYMBOL);

  export const POL_MAINNET_TOKEN: RequiredToken = {
  	id: POL_MAINNET_TOKEN_ID,
  	network: POLYGON_MAINNET_NETWORK,
  	standard: 'ethereum',
  	category: 'default',
  	name: 'POL (prev. MATIC)',
  	symbol: POL_MAINNET_SYMBOL,
  	decimals: POL_DECIMALS,
  	icon: pol,
  	buy: {
  		onramperId: 'pol_polygon'
  	}
  };
  ```

- Update the following fields:
  - **Decimals** – token precision (e.g., `18`)
  - **Symbol** – short token symbol (e.g., `'POL'`, `'ARB'`)
  - **Network** – reference the network object created in the previous step
  - **Name** – display name of the token
  - **Icon** – SVG format, placed in `src/frontend/src/evm/<network>/assets` folder.
  - **Buy** – Onramper ID if applicable (e.g., `'pol_polygon'`)

- If the network includes testnet tokens, repeat the process for each testnet.

Finally, make sure that the object `SUPPORTED_<network>_TOKENS` exists and is accordingly updated, at the end of the file.

### Add network variant(s) to the Backend

In file `src/shared/src/types/network.ts`, add the network(s) variant to the `NetworkSettingsFor` enum, similar to the existing ones.

Furthermore, in the same file, add the chain ID(s) to the `EthereumNetworkId` enum, similar to the existing ones.

This process will generate new bindings. Once generated, the mapping of user networks must be updated manually:

1. Derived store `userNetworks` needs to map the new variant(s) to the respective network ID(s), similar to the existing ones.
2. Sub-function `networkIdToKey` of util `mapUserNetworks` needs to map the new network ID(s) to the respective network variant(s), similar to the existing ones.

### Include network(s) and token(s) in EVM List

After creating your network and token objects, make sure they are registered in the global EVM lists.

#### 1. Add the Network to `SUPPORTED_EVM_NETWORKS`

Location: `src/frontend/src/env/networks/networks-evm/networks.evm.env.ts`

Action: Add your constant to the `SUPPORTED_EVM_NETWORKS` list:

```ts
export const SUPPORTED_EVM_NETWORKS = [
	...SUPPORTED_BASE_NETWORKS,
	...SUPPORTED_BSC_NETWORKS,
	...SUPPORTED_POLYGON_NETWORKS,
	...(SUPPORTED_ < NETWORK > _NETWORKS)
];
```

#### 2. Add the Token to `SUPPORTED_EVM_TOKENS`

Location: `src/frontend/src/env/tokens/tokens-evm/tokens.evm.env.ts`

Action: Include your network's token list in the main EVM token array:

```ts
export const SUPPORTED_EVM_TOKENS = [
	...SUPPORTED_BASE_TOKENS,
	...SUPPORTED_BSC_TOKENS,
	...SUPPORTED_POLYGON_TOKENS,
	...(SUPPORTED_ < NETWORK > _TOKENS)
];
```

### Create derived store for enabled network(s)

Create file `src/frontend/src/evm/<network>/derived/networks.derived.ts`, by copying an existing one from the other EVM networks.

Then, update the content accordingly. For example:

```typescript
export const enabledPolygonNetworks: Readable<EthereumNetwork[]> = derived(
	[testnetsEnabled, userNetworks],
	([$testnetsEnabled, $userNetworks]) =>
		defineEnabledNetworks({
			$testnetsEnabled,
			$userNetworks,
			mainnetFlag: POLYGON_MAINNET_ENABLED,
			mainnetNetworks: [POLYGON_MAINNET_NETWORK],
			testnetNetworks: [POLYGON_AMOY_NETWORK]
		})
);
```

Finally, include it in derived store `enabledEvmNetworks`, in file `src/frontend/src/evm/derived/networks.derived.ts`:

```typescript
export const enabledEvmNetworks: Readable<EthereumNetwork[]> = derived(
	[enabledBaseNetworks, enabledBscNetworks, enabledPolygonNetworks],
	([$enabledBaseNetworks, $enabledBscNetworks, $enabledPolygonNetworks]) => [
		...$enabledBaseNetworks,
		...$enabledBscNetworks,
		...$enabledPolygonNetworks
	]
);
```

### Create derived store for enabled token(s)

Create file `src/frontend/src/evm/<network>/derived/tokens.derived.ts`, by copying an existing one from the other EVM networks.

Then, update the content accordingly. For example:

```typescript
export const enabledPolygonTokens: Readable<RequiredToken[]> = derived(
	[testnetsEnabled, userNetworks],
	([$testnetsEnabled, $userNetworks]) =>
		defineEnabledTokens({
			$testnetsEnabled,
			$userNetworks,
			mainnetFlag: POLYGON_MAINNET_ENABLED,
			mainnetTokens: [POL_MAINNET_TOKEN],
			testnetTokens: [POL_AMOY_TOKEN]
		})
);
```

Finally, include it in derived store `enabledEvmTokens`, in file `src/frontend/src/evm/derived/tokens.derived.ts`:

```typescript
export const enabledEvmTokens: Readable<RequiredToken[]> = derived(
	[enabledBaseTokens, enabledBscTokens, enabledPolygonTokens],
	([$enabledBaseTokens, $enabledBscTokens, $enabledPolygonTokens]) => [
		...$enabledBaseTokens,
		...$enabledBscTokens,
		...$enabledPolygonTokens
	]
);
```

### Define network default token

Each network should have a default token as fallback. To define one for EVM networks the following is required:

- Util function to check if a Network ID is a valid ID for the new network, in file `src/frontend/src/lib/utils/network.utils.ts`. For example:

```typescript
export const isNetworkIdBase: IsNetworkIdUtil = (id) =>
	nonNullish(id) && SUPPORTED_BASE_NETWORK_IDS.includes(id);
```

- Derived store to verify that the current network is the new network, in file `src/frontend/src/lib/derived/network.derived.ts`. For example:

```typescript
export const networkBase: Readable<boolean> = derived([networkId], ([$networkId]) =>
	isNetworkIdBase($networkId)
);
```

- The default token definition for the new network, in file `src/frontend/src/lib/constants/tokens.constants.ts`. For example:

```typescript
export const [DEFAULT_BASE_TOKEN] = SUPPORTED_BASE_TOKENS;
```

### Add ERC20 tokens to the list of supported tokens

If the new network supports ERC-20 tokens, they can be included among the supported tokens.

> [!TIP]
> Tokens standard that are an extension of the ERC-20 standard can be included too. For example BEP-20 of BNB Smart Chain can be treated the same as ERC-20 by OISY.

To do this, the following steps are required:

- Create a folder in `src/frontend/src/env/tokens/tokens-evm/tokens-<network>/` named `tokens-erc20`
- For each token:
  - Create a file named: `tokens.<token>.env.ts`
  - Copy content from a similar token file in another EVM network.
  - Update the following fields:
    - `name`
    - `symbol`
    - `decimals`
    - `network` (reference the correct network object)
    - `icon` (SVG format, placed in `evm/<network>/assets/`)

- If the token has similar bridged tokens on the other EVM networks or on IC, add the `groupData` property, similar to existing ones (for example USDC, USDT, etc.).

Once all the new ERC20 tokens are created, they need to be added to the list of supported tokens:

- Create a new list <network>\_ERC20_TOKENS in `src/frontend/src/env/tokens/tokens-evm/tokens-<network>/tokens.erc20.env.ts`, similar to the existing ones for other EVM networks.
- Add the list to the `EVM_ERC20_TOKENS` list in `src/frontend/src/env/tokens/tokens-evm/tokens.erc20.env.ts`.

### Adapt exchange rate workers

In the first step, the exchange IDs and required fields should have been already be set. Now, the worker needs to be updated to include the new network.

- In service `syncExchange` of the exchange worker in file `src/frontend/src/lib/workers/exchange.worker.ts`, add the new network in the filter for the ERC-20 price parameters. As example, when this document was written, the filter was:

```typescript
if (
	coingeckoId !== 'ethereum' &&
	coingeckoId !== 'base' &&
	coingeckoId !== 'binance-smart-chain' &&
	coingeckoId !== 'polygon-pos'
) {
	return acc;
}
```

- Set the price for the native token(s) that are not a fork of ETH token:
  - Create a price-fetching function similar to the existing ones in file `src/frontend/src/lib/services/exchange.services.ts`. For example:

```typescript
export const exchangeRateBNBToUsd = (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'binancecoin',
		vs_currencies: Currency.USD
	});
```

- Use the function created above in the worker to fetch the price of the new token(s) in service `syncExchange` of the exchange worker in file `src/frontend/src/lib/workers/exchange.worker.ts`. Adapt the types if necessary.
- Map the new token ID(s) to the correct price in the `exchanges` derived store in file `src/frontend/src/lib/derived/exchange.derived.ts`, similar to the existing ones.
- Set the price for the native token(s) that are a fork of ETH token:
  - Just map the new token ID(s) to the ETH price in the `exchanges` derived store in file `src/frontend/src/lib/derived/exchange.derived.ts`, similar to the existing ones.

### Add providers' URLs to Content Security Policy (CSP)

The script that builds the CSP is `scripts/build.csp.mjs`.
It must be updated to include the new network providers' URLs (and any other required URL), similar to the existing ones.

### Optional

- Define a custom Hero color palette for the new network in `src/frontend/src/lib/components/hero/HeroContent.svelte`, similar to the existing ones.
- If provided, please add any additional information that might be useful for the new network. For example, a specific faucet to the list in this same document.

> [!NOTE]
> Remember to adapt all the existing tests and create new ones where needed, including E2E tests.

## Build Frontend Locally with Docker

To test building the frontend locally with Docker and inspect the results, follow these steps:

### 1. Build the Docker image

```bash
docker build . --file Dockerfile.frontend -t oisy-wallet --progress=plain
```

2. Copy the build output to your machine

```bash
docker create --name oisy-wallet oisy-wallet /bin/true
docker cp oisy-wallet:/frontend ./tmp/frontend-output
docker rm oisy-wallet
```

> Notes:
>
> - Our final image uses `FROM scratch`, it has no default command or shell. To work around this, we specify a dummy command (`/bin/true`) when creating the container.
> - Run `mkdir -p ./tmp` to ensure the folder exists before copying files into it.

3. Serve the results locally (optional)

```bash
npx serve ./tmp/frontend-output
```
