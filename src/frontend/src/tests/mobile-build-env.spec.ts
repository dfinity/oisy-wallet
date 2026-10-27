import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const check = join(process.cwd(), 'mobile/capacitor/check-build-env.mjs');

const run = ({ file = '', key }: { file?: string; key?: string } = {}) => {
	const cwd = mkdtempSync(join(tmpdir(), 'oisy-mobile-env-'));
	try {
		writeFileSync(join(cwd, '.env.development.local'), file);
		return spawnSync(process.execPath, [check], {
			cwd,
			env: key === undefined ? {} : { VITE_ETHERSCAN_API_KEY: key },
			encoding: 'utf8'
		});
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
};

describe('mobile build environment', () => {
	it('rejects a build without an Etherscan history key', () => {
		const result = run();

		expect(result.status).toBe(1);
		expect(result.stderr).toMatch(/Mobile build requires VITE_ETHERSCAN_API_KEY/);
	});

	it('rejects an empty or whitespace-only key', () => {
		for (const key of ['', '   ']) {
			expect(run({ key }).status).toBe(1);
		}
	});

	it('loads the audit development configuration without printing the key', () => {
		const result = run({ file: 'VITE_ETHERSCAN_API_KEY=fixture-not-a-real-key\n' });

		expect(result.status).toBe(0);
		expect(result.stdout + result.stderr).toBe('');
	});

	it('honors a build-environment key over the local file', () => {
		const result = run({ file: 'VITE_ETHERSCAN_API_KEY=\n', key: 'fixture-not-a-real-key' });

		expect(result.status).toBe(0);
		expect(result.stdout + result.stderr).toBe('');
	});
});
