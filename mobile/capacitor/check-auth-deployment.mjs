import { readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { parseArgs } from 'node:util';
import * as z from 'zod';
import { readAppEnvironment } from './app-environment.mjs';

const environment = readAppEnvironment();

// This checks supplied deployment files. It never enables SDK auth or grants authority.
const options = z.object({
	'application-id': z.string().regex(/^[A-Z0-9]{10}\.[A-Za-z0-9.-]+$/),
	callback: z.literal(environment.authCallbackURL),
	allowlist: z.string().min(1),
	association: z.string().min(1),
	entitlements: z.string().min(1),
	profile: z.string().min(1)
});
const entitlementSchema = z.object({
	'application-identifier': z.string().optional(),
	'com.apple.developer.team-identifier': z.string().optional(),
	'com.apple.developer.associated-domains': z.array(z.string()).optional()
});
const profileEntitlementSchema = entitlementSchema.extend({
	'com.apple.developer.associated-domains': z
		.union([z.array(z.string()), z.literal('*')])
		.optional()
});

/**
 * @param {string} file
 * @returns {unknown}
 */
const readDocument = (file) => {
	try {
		if (statSync(file).size > 65_536) {
			throw new Error('Document exceeds limit');
		}
		return JSON.parse(readFileSync(file, 'utf8'));
	} catch {
		throw new Error(`Cannot read bounded JSON document: ${basename(file)}`);
	}
};

try {
	const { values } = parseArgs({
		options: {
			'application-id': {
				type: 'string',
				default: `${environment.teamID}.${environment.deviceBundleID}`
			},
			callback: { type: 'string', default: environment.authCallbackURL },
			allowlist: { type: 'string' },
			association: { type: 'string' },
			entitlements: { type: 'string' },
			profile: { type: 'string' }
		}
	});
	const config = options.parse(values);
	const allowlist = z
		.object({ callbacks: z.array(z.string()) })
		.parse(readDocument(config.allowlist));
	const association = z
		.object({
			webcredentials: z.object({ apps: z.array(z.string()) }).optional(),
			applinks: z
				.object({
					details: z
						.array(
							z.object({
								appIDs: z.array(z.string()).optional(),
								components: z
									.array(z.object({ '/': z.string().optional(), exclude: z.boolean().optional() }))
									.optional()
							})
						)
						.optional()
				})
				.optional()
		})
		.parse(readDocument(config.association));
	const entitlements = entitlementSchema.parse(readDocument(config.entitlements));
	const profile = z
		.object({ Entitlements: profileEntitlementSchema, ExpirationDate: z.string() })
		.parse(readDocument(config.profile));
	const callback = new URL(config.callback);
	const domain = `webcredentials:${callback.hostname}`;
	const appLink = `applinks:${callback.hostname}`;
	const appID = config['application-id'];
	const [team] = appID.split('.');
	const profileDomains = profile.Entitlements['com.apple.developer.associated-domains'] ?? [];
	const checks = [
		{
			name: 'II allowlist names the exact audit callback',
			pass: allowlist.callbacks.includes(config.callback)
		},
		{
			name: 'AASA webcredentials names this app',
			pass: association.webcredentials?.apps.includes(appID) === true
		},
		{
			name: 'AASA applinks routes the exact callback to this app',
			pass:
				association.applinks?.details?.some(
					(detail) =>
						detail.appIDs?.includes(appID) &&
						detail.components?.some(
							(component) => component['/'] === callback.pathname && component.exclude !== true
						)
				) === true
		},
		{
			name: 'Signed app enables callback applinks for audit',
			pass: entitlements['com.apple.developer.associated-domains']?.includes(appLink) === true
		},
		{
			name: 'Signed app identifier matches',
			pass: entitlements['application-identifier'] === appID
		},
		{
			name: 'Signed app team matches',
			pass: entitlements['com.apple.developer.team-identifier'] === team
		},
		{
			name: 'Signed app enables webcredentials for audit',
			pass: entitlements['com.apple.developer.associated-domains']?.includes(domain) === true
		},
		{
			name: 'Profile uses this explicit app identifier',
			pass: profile.Entitlements['application-identifier'] === appID
		},
		{
			name: 'Profile team matches',
			pass: profile.Entitlements['com.apple.developer.team-identifier'] === team
		},
		{
			name: 'Profile permits the associated domain',
			pass:
				profileDomains === '*' ||
				profileDomains.includes('*') ||
				[domain, appLink].every((value) => profileDomains.includes(value))
		},
		{ name: 'Profile has not expired', pass: Date.parse(profile.ExpirationDate) > Date.now() }
	];
	for (const check of checks) {
		process.stdout.write(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}\n`);
	}
	process.stdout.write(
		'Supplied-file checks only. Verify signatures, device association, Universal Link routing and live SDK sign-in separately.\n'
	);
	process.exitCode = checks.every(({ pass }) => pass) ? 0 : 1;
} catch (error) {
	console.error(
		error instanceof z.ZodError
			? 'Invalid authentication deployment configuration or document shape.'
			: error instanceof Error
				? error.message
				: 'Authentication deployment check failed.'
	);
	process.exitCode = 1;
}
