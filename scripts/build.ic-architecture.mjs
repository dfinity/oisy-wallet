#!/usr/bin/env node

import { notEmptyString } from '@dfinity/utils';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import OISY_DOMAINS from './domains.json' with { type: 'json' };

const network = process.env.DFX_NETWORK ?? process.env.NETWORK;

// Signer builds also target `ic`, but they are served by their own canisters and domains, which
// this manifest does not describe.
const IS_SIGNER_BUILD = notEmptyString(process.env.OISY_SIGNER_TARGET);

if (network !== 'ic' || IS_SIGNER_BUILD) {
	process.exit(0);
}

const canisterIds = JSON.parse(readFileSync(join(process.cwd(), 'canister_ids.json'), 'utf8'));
const frontendId = canisterIds.frontend?.ic;
const backendId = canisterIds.backend?.ic;

if (!frontendId || !backendId) {
	throw new Error('Missing mainnet frontend or backend canister ID in canister_ids.json');
}

const manifest = {
	version: '1.0.0',
	canisters: [
		{
			id: frontendId,
			name: 'frontend',
			role: 'OISY Wallet frontend'
		},
		{
			id: backendId,
			name: 'backend',
			role: 'OISY Wallet backend'
		}
	]
};

const wellKnownDir = join(process.cwd(), 'build', '.well-known');
mkdirSync(wellKnownDir, { recursive: true });
writeFileSync(join(wellKnownDir, 'ic-architecture'), JSON.stringify(manifest));

// Every production wallet origin, including the raw icp0.io one, signs users in with principals
// derived for the canonical domain, so agents must request delegations for that origin.
writeFileSync(join(wellKnownDir, 'ii-derivation-origin'), OISY_DOMAINS.frontend.ic);
