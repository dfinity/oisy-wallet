<div align="center" style="display:flex;flex-direction:column;">
  <h1>Oisy wallet</h1>

  <a href="https://tewsx-xaaaa-aaaad-aadia-cai.icp0.io/">
    <img src="./src/frontend/static/images/meta-share.jpg" alt="NNS Dapp logo" role="presentation"/>
  </a>

<br/>
<br/>

[![GitHub Workflow Status (with event)](https://img.shields.io/github/actions/workflow/status/dfinity/ic-eth-wallet/build.yml?logo=github&label=Build%20and%20test)](https://github.com/dfinity/ic-eth-wallet/actions/workflows/build.yml)
<a href="https://github.com/dfinity/ic-eth-wallet/releases"><img src="https://img.shields.io/github/downloads/dfinity/ic-eth-wallet/total?label=downloads&logo=github" alt="GitHub all releases"></a>
[![Chat on Discord](https://img.shields.io/badge/chat-Discord-lightgrey?logo=Discord&style=flat-square)](https://discord.gg/E9FxceAg2j)

</div>

---

**A novel Ethereum wallet that is hosted on the Internet Computer, is browser-based, fully on-chain and secured by chain-key cryptography and Internet Identity.**

*The project is still work in progress, see the [disclaimer below](#status).*

## What is Oisy

Oisy is a technology demonstrator with the goal to develop a novel Ethereum wallet that is secure, simple to use, and makes as few assumptions about the user's operating environment as possible. It is secure because it relies on [Threshold ECDSA](https://internetcomputer.org/docs/current/developer-docs/integrations/t-ecdsa/) and introduces the novel concept of `networked-custody`. It is simple to use because it uses [Internet Identity](https://internetcomputer.org/internet-identity) to authenticate the user. It strives to reach the widest possible audience by being browser-based and unencumbered by licensing restriction from the various app stores. It is originally built by DFINITY and licensed under an [open source license](LICENSE).

## Goals

Oisy is designed to run natively on the Internet Computer, while at the same time holding native ETH and ERC-20 tokens and interacting with Ethereum smart contracts. Current features include sending and receiving ETH and a small list of ERC-20 tokens, receiving directly from Metamask and integration with Wallet Connect.

More concretely, Oisy goals are:

1. **fully on-chain** Internet Computer makes it possible to natively host any n-tiered dApp and gives users strong cryptographic guarantees that the content they load, static or dynamic, has not been tampered with. These guarantees are ideal for wallets, which require end-to-end security guarantees.

2. **networked-custody** When it comes to wallets, Ethereum users face the following choices, easy-to-use, custodial, browser-based wallets vis-a-vis cumbersome, non-custodial, app-based or browser-plugin-based wallets. Oisy uses [Threshold ECDSA](https://internetcomputer.org/docs/current/developer-docs/integrations/t-ecdsa/) to offer **networked-custody** as a third choice, where you neither have to trust institutions with your private keys, nor are you encumbered by password-based access for personal safeguarding of your private keys. With **networked-custody**, your private key is split across network nodes offering you ease of use and security.

3. **browser-based** No matter your browser and operating system preference, you should be able to transact with the Ethereum network as simply as when you use a custodial wallet.

4. **free to use and develop** Oisy is open-source software and licensed under the INTERNET COMPUTER COMMUNITY SOURCE LICENSE

## Prerequisites
-   [x] Download and [install the IC SDK](https://internetcomputer.org/docs/current/developer-docs/setup/index.md) if you do not already have it.


## Start the local replica

Open a new terminal window _in the project directory_, and run the following command to start the local replica. The replica will not start unless `dfx.json` exists in the current directory.

```
dfx start --background
```

When you're done with development, or you're switching to a different dfx project, running

```
dfx stop
```

from the project directory will stop the local replica.

## Build & run the dapp

Make sure you switch back to the project root directory.

First, install the frontend dependencies by running

```
npm install
```

To build and deploy the project, run
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

Click on the `Frontend canister via browser` URL to access the Oisy wallet running locally.


## Local development

You can serve the frontend in development mode like you normally develop a svelte app using the command

```
npm run dev
```
