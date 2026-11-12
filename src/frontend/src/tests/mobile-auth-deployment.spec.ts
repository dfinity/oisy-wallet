import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const check = join(process.cwd(), 'mobile/capacitor/check-auth-deployment.mjs');
const appID = 'TESTTEAM01.org.oisy.fixture';
const callback = 'https://audit.oisy.com/signer-callback';
const domain = 'webcredentials:audit.oisy.com';
const entitlements = {
	'application-identifier': appID,
	'com.apple.developer.team-identifier': 'TESTTEAM01',
	'com.apple.developer.associated-domains': [domain, 'applinks:audit.oisy.com']
};
const profile = {
	Entitlements: entitlements,
	ExpirationDate: '2100-01-01T00:00:00Z'
};

const run = ({
	documents = {},
	callbackURL = callback
}: {
	documents?: Record<string, unknown>;
	callbackURL?: string;
} = {}) => {
	const cwd = mkdtempSync(join(tmpdir(), 'oisy-auth-deployment-'));
	try {
		const files = {
			allowlist: { callbacks: [callback] },
			association: {
				webcredentials: { apps: [appID] },
				applinks: { details: [{ appIDs: [appID], components: [{ '/': '/signer-callback' }] }] }
			},
			entitlements,
			profile,
			...documents
		};
		const args = ['--application-id', appID, '--callback', callbackURL];
		for (const [name, value] of Object.entries(files)) {
			const file = join(cwd, `${name}.json`);
			writeFileSync(file, JSON.stringify(value));
			args.push(`--${name}`, file);
		}
		return spawnSync(process.execPath, [check, ...args], { cwd, encoding: 'utf8' });
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
};

describe('mobile HTTPS authentication deployment', () => {
	it('accepts matching files without claiming that live sign-in works', () => {
		const result = run();

		expect(result.status).toBe(0);
		expect(result.stdout).toContain('Supplied-file checks only');
	});

	it.each([{ domains: ['*'] }, { domains: '*' }])(
		'accepts a provisioning profile wildcard in either Apple format: $domains',
		({ domains }) => {
			const result = run({
				documents: {
					profile: {
						...profile,
						Entitlements: { ...entitlements, 'com.apple.developer.associated-domains': domains }
					}
				}
			});

			expect(result.status).toBe(0);
		}
	);

	it.each([{ domains: ['*'] }, { domains: '*' }])(
		'rejects wildcard domains in signed app entitlements: $domains',
		({ domains }) => {
			const result = run({
				documents: {
					entitlements: { ...entitlements, 'com.apple.developer.associated-domains': domains }
				}
			});

			expect(result.status).toBe(1);
		}
	);

	it('rejects arbitrary string domain entitlements in a profile', () => {
		const result = run({
			documents: {
				profile: {
					...profile,
					Entitlements: { ...entitlements, 'com.apple.developer.associated-domains': domain }
				}
			}
		});

		expect(result.status).toBe(1);
	});

	it.each([
		'https://other.example/signer-callback',
		`${callback}/`,
		`${callback}?redirect=1`,
		'http://audit.oisy.com/signer-callback'
	])('rejects changing the audit callback or derivation origin: %s', (callbackURL) => {
		expect(run({ callbackURL }).status).toBe(1);
	});

	it('rejects an allowlist that names a different callback', () => {
		const result = run({ documents: { allowlist: { callbacks: [`${callback}/other`] } } });

		expect(result.status).toBe(1);
		expect(result.stdout).toContain('FAIL II allowlist');
	});

	it('rejects applinks alone and a different app in webcredentials', () => {
		for (const association of [
			{ applinks: { apps: [appID] } },
			{ webcredentials: { apps: ['TESTTEAM01.org.oisy.other'] } }
		]) {
			const result = run({ documents: { association } });

			expect(result.status).toBe(1);
			expect(result.stdout).toContain('FAIL AASA webcredentials');
		}
	});

	it('rejects a missing domain entitlement even when AASA is correct', () => {
		const result = run({
			documents: {
				entitlements: {
					...entitlements,
					'com.apple.developer.associated-domains': ['applinks:audit.oisy.com']
				}
			}
		});

		expect(result.status).toBe(1);
		expect(result.stdout).toContain('FAIL Signed app enables webcredentials');
	});

	it('rejects a missing callback route or an excluded Universal Link', () => {
		for (const components of [
			[],
			[{ '/': '/another-path' }],
			[{ '/': '/signer-callback', exclude: true }]
		]) {
			const result = run({
				documents: {
					association: {
						webcredentials: { apps: [appID] },
						applinks: { details: [{ appIDs: [appID], components }] }
					}
				}
			});

			expect(result.status).toBe(1);
			expect(result.stdout).toContain('FAIL AASA applinks');
		}
	});

	it('rejects a signed app or profile without the callback applinks entitlement', () => {
		const withoutAppLink = { ...entitlements, 'com.apple.developer.associated-domains': [domain] };

		expect(run({ documents: { entitlements: withoutAppLink } }).status).toBe(1);
		expect(
			run({ documents: { profile: { ...profile, Entitlements: withoutAppLink } } }).status
		).toBe(1);
	});

	it('rejects the wrong signed app or team', () => {
		for (const override of [
			{ 'application-identifier': 'TESTTEAM01.org.oisy.other' },
			{ 'com.apple.developer.team-identifier': 'OTHERTEAM1' }
		]) {
			expect(run({ documents: { entitlements: { ...entitlements, ...override } } }).status).toBe(1);
		}
	});

	it('rejects a profile for another app, missing capability, or expired profile', () => {
		for (const invalid of [
			{ ...profile, Entitlements: { ...entitlements, 'application-identifier': 'TESTTEAM01.*' } },
			{
				...profile,
				Entitlements: { ...entitlements, 'com.apple.developer.associated-domains': [] }
			},
			{ ...profile, ExpirationDate: '2000-01-01T00:00:00Z' },
			{ ...profile, ExpirationDate: 'invalid' }
		]) {
			expect(run({ documents: { profile: invalid } }).status).toBe(1);
		}
	});

	it('rejects malformed and oversized documents without echoing their contents', () => {
		for (const value of [
			{ callbacks: 'not-an-array' },
			{ callbacks: [callback], ignored: 'private-fixture'.repeat(6000) }
		]) {
			const result = run({ documents: { allowlist: value } });

			expect(result.status).toBe(1);
			expect(result.stdout + result.stderr).not.toContain('private-fixture');
		}
	});
});
