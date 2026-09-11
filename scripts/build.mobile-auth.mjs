#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OISY_IC_DOMAIN, replaceEnv } from './build.utils.mjs';

// The ICRC-167 spec requires the relying party to allowlist its callback URLs
// byte-for-byte at /.well-known/ii-auth-callbacks. The callback origin is the
// environment's canonical domain, so it is substituted at build time — same
// mechanism as ic-domains.
const generateAuthCallbacks = (targetFile) => {
	let content = readFileSync(targetFile, 'utf8');

	content = replaceEnv({
		content,
		pattern: `{{VITE_OISY_DOMAIN}}`,
		value: OISY_IC_DOMAIN
	});

	writeFileSync(targetFile, content);
};

generateAuthCallbacks(join(process.cwd(), 'build', '.well-known', 'ii-auth-callbacks'));
