import { join } from 'node:path';
import { findFiles } from './utils.mjs';

export const findHtmlFiles = (dir = join(process.cwd(), 'build')) =>
	findFiles({ dir, extensions: ['.html'] });

const REQUESTED_ENV = process.env.ENV ?? process.env.DFX_NETWORK ?? '';

export const ENV =
	REQUESTED_ENV === 'ic'
		? 'production'
		: (REQUESTED_ENV ?? '').startsWith('test_fe_')
			? 'staging'
			: ['staging', 'beta'].includes(REQUESTED_ENV)
				? REQUESTED_ENV
				: 'development';

const OISY_DOMAINS_FILE = 'domains.json';
export const OISY_DOMAINS = () => {
	const jsonPath = resolve(OISY_DOMAINS_FILE);
	return JSON.parse(readFileSync(jsonPath, 'utf-8'));
};
const domain_for_dfx_network = (dfx_network) =>
	OISY_DOMAINS_FILE.frontend[dfx_network] || `https://${dfx_network}.oisy.com`;

// The domain name, as in the browser location bar and in the web assets under .well-known/ic-domain
export const OISY_IC_DOMAIN = domain_for_dfx_network(process.env.DFX_NETWORK);

export const replaceEnv = ({ content, pattern, value }) => {
	const regex = new RegExp(pattern, 'g');
	return content.replace(regex, value);
};
