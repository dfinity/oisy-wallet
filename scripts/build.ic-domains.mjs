import { config } from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ENV, replaceEnv } from './build.utils.mjs';

const domain_for_dfx_network = (dfx_network) => {
  return dfx_network === 'ic'? 'https://oisy.com'
       : dfx_network === 'test_fe_1'? 'https://fe1.oisy.com'
       : dfx_network === 'test_fe_2'? 'https://fe2.oisy.com'
       : dfx_network === 'test_fe_3'? 'https://fe3.oisy.com'
       : dfx_network === 'test_fe_4'? 'https://fe4.oisy.com'
       : dfx_network === 'staging'? 'https://staging.oisy.com'
       : dfx_network === 'beta'? 'https://beta.oisy.com'
       : dfx_network === 'audit'? 'https://audit.oisy.com'
       : `https://${dfx_network}.oisy.com`;
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
