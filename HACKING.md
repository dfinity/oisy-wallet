# Hacking

This document list a couple of useful information for development and deployment purpose.

## Development

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
# The airdrop canister should have been manually created before deploying the backend.
ENV=staging ./scripts/deploy.backend.sh
ENV=staging ./scripts/deploy.airdrop.sh
```

### IC

> To perform production development, you'll need a `.env.production` file.

```bash
ENV=ic dfx deploy frontend --network ic --wallet yit3i-lyaaa-aaaan-qeavq-cai
# The airdrop canister should have been manually created before deploying the backend.
ENV=ic ./scripts/deploy.backend.sh
ENV=ic ./scripts/deploy.airdrop.sh
```
