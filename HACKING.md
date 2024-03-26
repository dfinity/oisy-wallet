# Hacking

This document lists a couple of useful information for development and deployment purpose.

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
3. Replace the file loaded in [i18n.store.ts](src/frontend/src/lib/stores/i18n.store.ts).

In the future, Oisy might be extended to support multiple languages on production.

## Adding additional keys

Translations are handled in JSON files but, as we are consuming these through a store, their representation have to exist as interfaces. To ease the process we have developed a script which extracts the declarations automatically. In case you would add new keys, run npm run i18n to generate the interfaces.
