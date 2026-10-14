# OISY browser extension (proof of concept)

Lets dapps that only support extension wallets connect to OISY and sign. The extension holds no keys:
it announces OISY to the page, decides which sites may see which address, and opens an oisy.com
popup where the existing review screens show and sign every request.

Local only, against staging, on Sepolia and Solana devnet. Chromium browsers only.

## How a request travels

1. `inpage.js` runs in the page. It announces an EIP-1193 provider through EIP-6963 and registers a
   Wallet Standard wallet for Solana.
2. `content.js` carries messages between the page and the background worker.
3. `background.js` takes the site's origin from the browser, checks the site is connected, answers
   read-only calls from a public node, and opens the OISY popup for connect and sign requests.
4. The popup (`/extension/` in the OISY frontend) fetches the request from the extension, shows the
   connect screen or the WalletConnect review, signs, and sends the result back.

## Run it

```bash
DFX_NETWORK=staging npm run dev -- --port 5175 --strictPort
```

```bash
node src/extension/test-dapp/serve.js
```

Then in Chrome, open `chrome://extensions`, turn on Developer mode, choose **Load unpacked**, and
pick this folder. The extension ID must be `fcdljkamhcheddlldbaffbpiopkcjcog`; the OISY frontend
talks to that ID only.

Open http://localhost:8090.

## Try it

1. In OISY (http://localhost:5175), sign in and turn on testnets in Settings. Localhost gets its own
   II identity, so its addresses start empty.
2. On the test dapp, click **Connect** under Ethereum. Approve in the OISY popup.
3. **Sign a message** and **Sign typed data** need no funds. The result shows whether the signature
   recovers to your address.
4. Under Solana, **Connect**, then **Sign a message**.
5. Sending needs testnet funds: Sepolia ETH from a faucet for **Send 0 ETH to myself**, devnet SOL
   (`solana airdrop` or faucet.solana.com) for the Solana transaction buttons.

Real dapps on Sepolia or devnet work the same way, for example the MetaMask test dapp or the Solana
wallet adapter demo.

## Smoke test

Loads the extension into Playwright's Chromium and checks everything up to the II sign-in. Needs
both servers above.

```bash
node src/extension/scripts/smoke.js
```

## Known limits

- One request at a time; a second one gets error `-32002` until the first is answered.
- The background worker keeps open requests in memory. If Chrome stops it, the request is lost and
  the dapp gets an error.
- `window.ethereum` is left alone; dapps must support EIP-6963.
- No Bitcoin, no mainnet, no Firefox or Safari.
