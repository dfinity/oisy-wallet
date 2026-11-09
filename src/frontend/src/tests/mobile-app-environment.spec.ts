import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = join(process.cwd(), 'mobile/capacitor');
const environment = JSON.parse(readFileSync(join(root, 'app-environment.json'), 'utf8'));
const checkBuild = (values: Record<string, string>) =>
	spawnSync(process.execPath, [join(root, 'prepare-app-config.mjs'), '--check-build'], {
		encoding: 'utf8',
		env: { ...process.env, ...values }
	});
const checkAssociation = (documents: { association: unknown; callbacks: unknown }) =>
	spawnSync(
		process.execPath,
		[
			'--input-type=module',
			'-e',
			`const { readAppEnvironment, validateAppAssociation } = await import(process.argv[1]);
   validateAppAssociation({ environment: readAppEnvironment(), ...JSON.parse(process.argv[2]) });`,
			pathToFileURL(join(root, 'app-environment.mjs')).href,
			JSON.stringify(documents)
		],
		{ encoding: 'utf8' }
	);
const association = JSON.parse(
	readFileSync(join(root, 'auth-handoff/deployment/audit/apple-app-site-association'), 'utf8')
);
const callbacks = JSON.parse(
	readFileSync(join(root, 'auth-handoff/deployment/audit/ii-auth-callbacks'), 'utf8')
);

describe('shared audit app environment', () => {
	it('keeps a generic simulator identity and the existing signed phone identity', () => {
		expect(
			checkBuild({
				PLATFORM_NAME: 'iphonesimulator',
				PRODUCT_BUNDLE_IDENTIFIER: environment.simulatorBundleID
			}).status
		).toBe(0);
		expect(
			checkBuild({
				PLATFORM_NAME: 'iphoneos',
				PRODUCT_BUNDLE_IDENTIFIER: environment.deviceBundleID,
				DEVELOPMENT_TEAM: environment.teamID,
				CODE_SIGNING_ALLOWED: 'YES'
			}).status
		).toBe(0);
	});

	it('refuses a device build using the simulator ID before attempting II authentication', () => {
		const result = checkBuild({
			PLATFORM_NAME: 'iphoneos',
			PRODUCT_BUNDLE_IDENTIFIER: environment.simulatorBundleID,
			DEVELOPMENT_TEAM: environment.teamID,
			CODE_SIGNING_ALLOWED: 'YES'
		});

		expect(result.status).toBe(1);
		expect(result.stderr).toContain('App bundle/team does not match');
	});

	it('requires the audit association team for a signed device build', () => {
		expect(
			checkBuild({
				PLATFORM_NAME: 'iphoneos',
				PRODUCT_BUNDLE_IDENTIFIER: environment.deviceBundleID,
				DEVELOPMENT_TEAM: 'OTHERTEAM1',
				CODE_SIGNING_ALLOWED: 'YES'
			}).status
		).toBe(1);
		expect(
			checkBuild({
				PLATFORM_NAME: 'iphoneos',
				PRODUCT_BUNDLE_IDENTIFIER: environment.deviceBundleID,
				DEVELOPMENT_TEAM: '',
				CODE_SIGNING_ALLOWED: 'NO'
			}).status
		).toBe(0);
	});

	it('rejects unknown target platforms', () => {
		expect(
			checkBuild({ PLATFORM_NAME: 'macosx', PRODUCT_BUNDLE_IDENTIFIER: environment.deviceBundleID })
				.status
		).toBe(1);
	});

	it('keeps both associated-domain registrations and the exact II callback aligned', () => {
		expect(checkAssociation({ association, callbacks }).status).toBe(0);
		expect(
			checkAssociation({ association: { ...association, webcredentials: { apps: [] } }, callbacks })
				.status
		).toBe(1);
		expect(
			checkAssociation({ association: { ...association, applinks: { details: [] } }, callbacks })
				.status
		).toBe(1);
		expect(
			checkAssociation({
				association,
				callbacks: { callbacks: [`${environment.authCallbackURL}/wrong`] }
			}).status
		).toBe(1);
	});

	it('preserves the previous auth storage namespaces', () => {
		expect(environment.legacyKeychainService).toBe('com.oisy.native.mvp.audit-session');
		expect(environment.sdkKeyTagPrefix).toBe('com.oisy.native.mvp.audit-session.sdk.');
		expect(environment.sdkStorageDirectory).toBe('oisy-sdk-auth-audit');
	});
});
