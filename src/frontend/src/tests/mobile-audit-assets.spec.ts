import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const command = join(process.cwd(), 'mobile/capacitor/auth-handoff/prepare-audit-assets.mjs');
const run = ({ directory, domain }: { directory: string; domain: string }) =>
	spawnSync(process.execPath, [command, '--out-dir', directory, '--domain', domain], {
		encoding: 'utf8'
	});

const withDirectory = (check: (directory: string) => void) => {
	const directory = mkdtempSync(join(tmpdir(), 'oisy-audit-assets-'));
	try {
		check(directory);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
};

describe('audit authentication deployment assets', () => {
	it('preserves the existing app and callback, and adds the preview capabilities', () => {
		withDirectory((directory) => {
			expect(run({ directory, domain: 'https://audit.oisy.com' }).status).toBe(0);

			const association = JSON.parse(
				readFileSync(join(directory, '.well-known/apple-app-site-association'), 'utf8')
			);

			expect(association.applinks.details[0].appIDs).toEqual([
				'7FY8G6QYKD.com.oisy.wallet',
				'7FY8G6QYKD.org.dfinity.oisy.native.preview.artem'
			]);
			expect(association.webcredentials.apps).toEqual([
				'7FY8G6QYKD.org.dfinity.oisy.native.preview.artem'
			]);
			expect(association.applinks.details[0].components[0]['/']).toBe('/signer-callback');
			expect(
				JSON.parse(readFileSync(join(directory, '.well-known/ii-auth-callbacks'), 'utf8'))
			).toEqual({
				callbacks: ['https://audit.oisy.com/signer-callback']
			});
			expect(
				JSON.parse(readFileSync(join(directory, '.well-known/assetlinks.json'), 'utf8'))[0].target
					.package_name
			).toBe('com.oisy.wallet');
		});
	});

	it.each([
		'https://oisy.com',
		'https://beta.oisy.com',
		'https://audit.oisy.com.attacker.example',
		'http://audit.oisy.com'
	])('does not publish the preview association to %s', (domain) => {
		withDirectory((directory) => {
			expect(run({ directory, domain }).status).toBe(0);
			expect(readdirSync(directory)).toEqual([]);
		});
	});

	it('fails a reused non-audit directory without erasing registrations', () => {
		withDirectory((directory) => {
			expect(run({ directory, domain: 'https://audit.oisy.com' }).status).toBe(0);

			const path = join(directory, '.well-known/apple-app-site-association');
			const before = readFileSync(path, 'utf8');

			expect(run({ directory, domain: 'https://oisy.com' }).status).toBe(1);
			expect(readFileSync(path, 'utf8')).toBe(before);
		});
	});
});
