import { config } from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ENV, replaceEnv } from './build.utils.mjs';

config({ path: `.env.${ENV}` });

const generateDomain = (targetFile) => {
	let content = readFileSync(targetFile, 'utf8');

	// For information such as custom domains, only the domain without protocol is required
	const { host: value } = new URL(process.env['VITE_OISY_URL'] ?? 'https://oisy.com');
	content = replaceEnv({
		content,
		pattern: `{{VITE_OISY_DOMAIN}}`,
		value
	});

	writeFileSync(targetFile, content);
};

generateDomain(join(process.cwd(), 'build', '.well-known', 'ic-domains'));
