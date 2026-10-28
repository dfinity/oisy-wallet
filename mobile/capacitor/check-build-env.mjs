import { loadEnv } from 'vite';

// The audit build uses development env files, matching vite.config.ts.
// Do not print values: these client credentials are bundled into the app.
const env = loadEnv('development', process.cwd());
const required = ['VITE_ETHERSCAN_API_KEY', 'VITE_INFURA_API_KEY', 'VITE_ALCHEMY_API_KEY'];
const xrpEnabled = env.VITE_XRP_MAINNET_DISABLED?.toLowerCase() !== 'true';
if (xrpEnabled) {
	required.push('VITE_XRP_RPC_URL_MAINNET');
}
const missing = required.filter((key) => !env[key]?.trim());
if (missing.length) {
	console.error(
		`Mobile build requires ${missing.join(', ')} for the shared wallet readers. ` +
			'Set them in an ignored .env.development.local file or the build environment. ' +
			'Use client RPC credentials authorized for the enabled networks.'
	);
	process.exit(1);
}
if (xrpEnabled) {
	let validUrl = false;
	try {
		const url = new URL(env.VITE_XRP_RPC_URL_MAINNET);
		validUrl = url.protocol === 'https:' && !url.username && !url.password && !url.hash;
	} catch {
		// Report the variable name only, never the credential-bearing URL.
	}
	if (!validUrl) {
		console.error(
			'VITE_XRP_RPC_URL_MAINNET must be an HTTPS RPC URL without userinfo or a fragment.'
		);
		process.exit(1);
	}
}
