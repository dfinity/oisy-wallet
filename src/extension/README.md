# OISY browser extension (proof of concept)

Lets dapps that only support extension wallets connect to OISY and sign. The extension holds no keys:
it announces OISY to the page, decides which sites may see which address, and opens an oisy.com
popup where the existing review screens show and sign every request. Clicking the toolbar icon opens
Chrome's side panel (Chrome 116 or later), which shows OISY's own page `/extension/panel/`: your
tokens, connected sites and Open OISY. The extension itself has no wallet UI.

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

1. In OISY (http://localhost:5175), sign in. In Settings, open Active networks, turn on test networks,
   then switch on Sepolia and Solana Devnet and save. The test networks toggle alone is not enough:
   OISY loads the devnet address only while Solana Devnet is on. Localhost gets its own II identity,
   so its addresses start empty.
2. On the test dapp, click **Connect** under Ethereum. Approve in the OISY popup.
3. **Sign a message** and **Sign typed data** need no funds. The result shows whether the signature
   recovers to your address.
4. Under Solana, **Connect**, then **Sign a message**.
5. Click the OISY icon in Chrome's toolbar. The side panel shows OISY's page with your tokens and
   connected sites, and stays open next to the dapp. Once you're signed in there, the extension
   picks up your account by itself.
6. Sending needs testnet funds: Sepolia ETH from a faucet for **Send 0 ETH to myself**, devnet SOL
   (`solana airdrop` or faucet.solana.com) for the Solana transaction buttons.

Real dapps on Sepolia or devnet work the same way, for example the MetaMask test dapp or the Solana
wallet adapter demo.

## Smoke test

Loads the extension into Playwright's Chromium and checks everything up to the II sign-in. Needs
both servers above.

```bash
node src/extension/scripts/smoke.js
```

## Production notes: letting the side panel embed OISY

oisy.com refuses to be embedded on every path (`X-Frame-Options: DENY` for `**/*` in
`src/frontend/static/.ic-assets.json`). The side panel needs one exception, for its own page only and
only for our extension. OISY's Content-Security-Policy is a `<meta>` tag, where browsers ignore
`frame-ancestors`, so the exception has to be a response header:

```json
{
	"match": "extension/panel/**/*",
	"headers": {
		"Content-Security-Policy": "frame-ancestors chrome-extension://<web-store-extension-id>"
	}
}
```

A header that sets only `frame-ancestors` adds no other restriction, and Chrome ignores
`X-Frame-Options` when `frame-ancestors` is present. Each environment needs its own extension ID.
This is not added to `.ic-assets.json` yet; check it on staging first. The local dev server sends no
framing headers, which is why the proof of concept works without it.

## Known limits

- One request at a time; a second one gets error `-32002` until the first is answered.
- The background worker keeps open requests in memory. If Chrome stops it, the request is lost and
  the dapp gets an error.
- `window.ethereum` is left alone; dapps must support EIP-6963.
- The side panel shows OISY's page after about 1–2 s on the local dev server (the extension's own
  panel used to show in about 0.1 s). If OISY doesn't answer within 15 s, the panel says so and
  offers Retry.
- No Bitcoin, no mainnet, no Firefox or Safari.
