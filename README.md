<div align="center" style="display:flex;flex-direction:column;">
  <h1>Oisy Wallet</h1>

  <a href="https://oisy.com/">
    <img src="./src/frontend/static/images/meta-share.jpg" alt="Oisy Wallet logo" role="presentation"/>
  </a>

<br/>
<br/>

[![GitHub Workflow Status (with event)](https://img.shields.io/github/actions/workflow/status/dfinity/ic-eth-wallet/build.yml?logo=github&label=Build%20and%20test)](https://github.com/dfinity/ic-eth-wallet/actions/workflows/build.yml)
<a href="https://github.com/dfinity/ic-eth-wallet/releases"><img src="https://img.shields.io/github/downloads/dfinity/ic-eth-wallet/total?label=downloads&logo=github" alt="GitHub all releases"></a>
[![Chat on Discord](https://img.shields.io/badge/chat-Discord-lightgrey?logo=Discord&style=flat-square)](https://discord.gg/E9FxceAg2j)

</div>


## What is the Oisy Wallet

The Oisy Wallet is a technology demonstrator that shows how one can build a multichain wallet using Internet Computer Protocol (ICP) technology. For now, it demonstrates how to manage Ethereum and ERC20 assets, but its architecture and the underlying ICP technology is extendable to control Bitcoin and IC-native tokens too. The name *OISy* derives from *Open Internet Services*. 

We invite you to take Oisy for a test drive at [oisy.com](https://oisy.com) and to explore the code in this repository. At this point, the project is still work in progress and not recommended for managing assets of significant value, see the [disclaimer below](#status).


## Features

The Oisy Wallet provides a convenient user experience known from custodial wallets without their strong trust assumptions. In contrast, it provides trust assumptions comparable to self-custody solutions. Different to self-custody wallets though, Oisy requires no browser extensions or additional mobile app, a standard off-the-shelf web browser is sufficient. In conclusion, Oisy provides a low entry barrier without the need for strong trust assumptions.

<div align="center" style="display:flex;flex-direction:column;">
  <img src="./oisy-comparison.svg" alt="Oisy feature comparison" style="max-width:500px"/>
</div>

In more detail, Oisy is: 

* **Browser-based:** No matter your browser and operating system preferences, Oisy allows you to receive, hold, and send native ETH and ERC-20 tokens on Ethereum. Currently, the list of ERC-20 tokens is hardcoded but it can easily be extended.

* **Networked-custody:** The key controlling your multichain assets is not controlled by a single entity. Shares of the key are distributed among many ICP replica nodes and signatures are created using [Threshold ECDSA](https://internetcomputer.org/docs/current/developer-docs/integrations/t-ecdsa/).

* **Fully on-chain:** Not only the keys but also the web assets are hosted on chain. Therefore the entire wallet is based on a decentralized trust model and guarantees that the entire wallet has not been tampered with. 

* **Interoperable:** Oisy integrates with [WalletConnect](https://walletconnect.com/) allowing you to use Oisy as a wallet for many established web3 services, such as Uniswap. Moreover, a Metamask integration demonstrates how other wallets can transfer assets to the Oisy wallet.

* **Free to use and develop:** Oisy is open-source software and licensed under [Apache 2.0](LICENSE). Feel free to fork it or propose improvements. 


## ICP building blocks used

What are the technical building blocks enabling the creation of Oisy? 

* **Chain-key signatures:** A novel threshold ECDSA signature protocol suite available on ICP enables smart contracts to perform cryptographic signatures without a single entity having full access to the private key. Read more about [chain-key cryptography](https://internetcomputer.org/how-it-works/chain-key-technology/) or start building based on [chain-key signature sample code](https://internetcomputer.org/docs/current/samples/t-ecdsa-sample).

* **HTTP outcalls:** Smart contracts on ICP can call standard HTTP endpoints in the Web 2.0 world using [HTTP outcalls](https://internetcomputer.org/https-outcalls). Check out the [HTTP outcalls sample code](https://internetcomputer.org/docs/current/developer-docs/integrations/https-outcalls/https-outcalls-how-to-use) to connect Web 3.0 with Web 2.0 yourself. 

* **Internet Identity (II):** Based on ICP's threshold signature schemes, Internet Identity (II) is an authentication and key management system with strong privacy and security guarantees. Using [WebAuthn](https://www.w3.org/TR/webauthn-3) users can conveniently create secure sessions using their fingerprint or other biometric sensors. Read more about [Internet Identity technology](https://internetcomputer.org/internet-identity) or [start integrating II](https://internetcomputer.org/docs/current/developer-docs/integrations/internet-identity/integrate-identity) into your canister smart contract. 

* **Web assets served from chain:** ICP is not only designed to run *backends*, such as ledgers, on chain, its low storage cost and low latency allows to serve *frontends*, such as HTML files and images, from chain, too. Read more about [smart contracts serving web assets](https://internetcomputer.org/how-it-works/smart-contracts-serve-the-web/) or directly start [building your first decentralized web frontend](https://internetcomputer.org/docs/current/developer-docs/frontend/).


## Related projects

While Oisy is intended as showcase, there are other projects who provide Oisy-like wallets in product quality. For example, check out the [Me Wallet](https://astrox.me/) by [AstroX](https://astrox.network).


## Status

This project is **not ready for production use** and for now meant to serve as technology demonstrator. We are happy to answer questions if they are raised as issues in this github repo.

## Build an run yourself

### Prerequisites

- [x] Install the [IC SDK](https://internetcomputer.org/docs/current/developer-docs/setup/install/index.mdx).

### Start the local replica

Open a new terminal window _in the project directory_, and run the following command to start the local replica. The replica will not start unless [dfx.json](dfx.json) exists in the current directory.

```
dfx start --background
```

When you're done with development, or you're switching to a different dfx project, running

```
dfx stop
```

from the project directory will stop the local replica.

### Run Oisy locally

Make sure you switch back to the project root directory.

First, install the frontend dependencies by running

```
npm ci
```

To build and deploy the project locally, first create a `.env.development` file by copying the [.env.example](.env.example) file. Once you've correctly set the api keys for all the different services that Oisy needs, then run:

```
npm run deploy
```

It should output something like the following

```
...
Deployed canisters.
URLs:
  Frontend canister via browser
    frontend: http://127.0.0.1:4943/?canisterId=br5f7-7uaaa-aaaaa-qaaca-cai
  Backend canister via Candid interface:
    backend: http://127.0.0.1:4943/?canisterId=bd3sg-teaaa-aaaaa-qaaba-cai&id=bkyz2-fmaaa-aaaaa-qaaaq-cai
    internet_identity: http://127.0.0.1:4943/?canisterId=bd3sg-teaaa-aaaaa-qaaba-cai&id=be2us-64aaa-aaaaa-qaabq-cai
```

Click on the **frontend** URL to access the Oisy Wallet that is running locally.

### Local development

See [HACKING](HACKING.md)

#### Backend

The backend is written in Rust and you can find it under the [backend folder](src/backend/). It uses the [tECDSA API](https://internetcomputer.org/docs/current/developer-docs/integrations/t-ecdsa/t-ecdsa-how-it-works) provided by IC. To find out more about tECDSA, you can read the [Eurocrypt 2022 paper](https://eprint.iacr.org/2021/1330.pdf).

If you want to locally deploy the backend only, you use the following command

```
./scripts/deploy.backend.sh
```

### Frontend

The frontend is written entirely in Svelte. You can serve the frontend in development mode like you normally develop a svelte app using the command

```
npm run dev
```
