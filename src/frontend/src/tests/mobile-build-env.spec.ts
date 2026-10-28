import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const check = join(process.cwd(), 'mobile/capacitor/check-build-env.mjs');
const configured = {
	VITE_ETHERSCAN_API_KEY: 'fixture-etherscan-key',
	VITE_INFURA_API_KEY: 'fixture-infura-key',
	VITE_ALCHEMY_API_KEY: 'fixture-alchemy-key',
	VITE_XRP_RPC_URL_MAINNET: 'https://rpc.example.com/fixture-xrp-key'
};
const configurationFile = Object.entries(configured)
	.map(([key, value]) => `${key}=${value}`)
	.join('\n');

const run = ({ file = '', env = {} }: { file?: string; env?: Record<string, string> } = {}) => {
	const cwd = mkdtempSync(join(tmpdir(), 'oisy-mobile-env-'));
	try {
		writeFileSync(join(cwd, '.env.development.local'), file);
		return spawnSync(process.execPath, [check], { cwd, env, encoding: 'utf8' });
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
};

describe('mobile build environment', () => {
	it('reports all missing provider configuration without printing values', () => {
		const result = run();

		expect(result.status).toBe(1);

		Object.keys(configured).forEach((key) => expect(result.stderr).toContain(key));
	});

	it.each(Object.keys(configured))('rejects a missing or blank %s', (key) => {
		for (const value of ['', '   ']) {
			const result = run({ env: { ...configured, [key]: value } });

			expect(result.status).toBe(1);
			expect(result.stderr).toContain(key);

			Object.values(configured).forEach((secret) => expect(result.stderr).not.toContain(secret));
		}
	});

	it('loads the audit development configuration without printing credentials', () => {
		const result = run({ file: configurationFile });

		expect(result.status).toBe(0);
		expect(result.stdout + result.stderr).toBe('');
	});

	it('honors build-environment credentials over the local file', () => {
		const result = run({ file: 'VITE_ALCHEMY_API_KEY=\n', env: configured });

		expect(result.status).toBe(0);
		expect(result.stdout + result.stderr).toBe('');
	});

	it('does not require an XRP endpoint when XRP is explicitly disabled', () => {
		const result = run({
			env: { ...configured, VITE_XRP_RPC_URL_MAINNET: '', VITE_XRP_MAINNET_DISABLED: 'true' }
		});

		expect(result.status).toBe(0);
	});

	it.each([
		'http://rpc.example.com',
		'not-a-url',
		'https://user:secret@rpc.example.com',
		'https://rpc.example.com/#secret'
	])('rejects an invalid XRP endpoint without printing it: %s', (url) => {
		const result = run({ env: { ...configured, VITE_XRP_RPC_URL_MAINNET: url } });

		expect(result.status).toBe(1);
		expect(result.stderr).toContain('VITE_XRP_RPC_URL_MAINNET must be an HTTPS RPC URL');
		expect(result.stderr).not.toContain(url);
	});
});
