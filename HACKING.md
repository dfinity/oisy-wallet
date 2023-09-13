# Hacking

This document list a couple of useful information for development and deployment purpose.

## Deployment

Following terminal commands are useful to deploy `frontend` and `backend`.

### Local development

```bash
npm run deploy
```

### Staging

```bash
ENV=staging dfx deploy frontend --network staging --wallet cvthj-wyaaa-aaaad-aaaaq-cai
ENV=staging ./scripts/deploy.backend.sh
```

### IC

```bash
ENV=ic dfx deploy frontend --network staging --wallet yit3i-lyaaa-aaaan-qeavq-cai
ENV=ic ./scripts/deploy.backend.sh
```
