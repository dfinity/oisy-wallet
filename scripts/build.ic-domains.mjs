import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OISY_IC_DOMAIN, replaceEnv } from './build.utils.mjs';

const generateDomain = (targetFile) => {
	let content = readFileSync(targetFile, 'utf8');

	const domain = OISY_IC_DOMAIN;

	// For information such as custom domains, only the domain without protocol is required
	const { host: value } = new URL(domain);
	content = replaceEnv({
		content,
		pattern: `{{VITE_OISY_DOMAIN}}`,
		value
	});

	writeFileSync(targetFile, content);
};

generateDomain(join(process.cwd(), 'build', '.well-known', 'ic-domains'));
