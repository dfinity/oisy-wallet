import { loadEnv } from 'vite';

// The audit build uses development env files, matching vite.config.ts.
const env = loadEnv('development', process.cwd());
if (!env.VITE_ETHERSCAN_API_KEY?.trim()) {
	console.error(
		'Mobile build requires VITE_ETHERSCAN_API_KEY for EVM transaction history. ' +
			'Set it in an ignored .env.development.local file or the build environment. ' +
			'Use a client API key authorized for the supported networks.'
	);
	process.exit(1);
}
