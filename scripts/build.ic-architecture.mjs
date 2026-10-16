#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const network = process.env.DFX_NETWORK ?? process.env.NETWORK;

if (network !== 'ic') {
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
