import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { replaceEnv } from './build.utils.mjs';

const DFX_NETWORK_DOMAINS = {
	ic: 'https://oisy.com',
	test_fe_1: 'https://fe1.oisy.com',
	test_fe_2: 'https://fe2.oisy.com',
	test_fe_3: 'https://fe3.oisy.com',
	test_fe_4: 'https://fe4.oisy.com',
	staging: 'https://staging.oisy.com',
	beta: 'https://beta.oisy.com',
	audit: 'https://audit.oisy.com'
};

const domain_for_dfx_network = (dfx_network) => {
	return DFX_NETWORK_DOMAINS[dfx_network] || `https://${dfx_network}.oisy.com`;
};

const generateDomain = (targetFile) => {
	let content = readFileSync(targetFile, 'utf8');

	const dfx_network = process.env.DFX_NETWORK;
	const domain = domain_for_dfx_network(dfx_network);

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
