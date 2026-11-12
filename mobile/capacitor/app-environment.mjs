import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as z from 'zod';

const origin = z
	.string()
	.url()
	.refine((value) => {
		const url = new URL(value);
		return url.protocol === 'https:' && value === url.origin;
	});
const bundleID = z.string().regex(/^[A-Za-z0-9]+(?:[.-][A-Za-z0-9]+)+$/);
export const appEnvironmentSchema = z
	.object({
		environment: z.literal('audit'),
		derivationOrigin: origin,
		authCallbackURL: z.string().url(),
		internetIdentityAuthorizeURL: z
			.string()
			.url()
			.refine((value) => {
				const url = new URL(value);
				return (
					url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash
				);
			}),
		internetIdentityCanisterID: z.string().regex(/^[a-z0-9-]+$/),
		internetComputerHost: origin,
		teamID: z.string().regex(/^[A-Z0-9]{10}$/),
		deviceBundleID: bundleID,
		simulatorBundleID: bundleID,
		legacyKeychainService: z.string().regex(/^[a-z0-9.-]+$/),
		sdkKeyTagPrefix: z.string().regex(/^[a-z0-9.-]+$/),
		sdkStorageDirectory: z.string().regex(/^[a-z0-9-]+$/)
	})
	.strict()
	.refine(({ derivationOrigin, authCallbackURL, deviceBundleID, simulatorBundleID }) => {
		const callback = new URL(authCallbackURL);
		return (
			callback.origin === derivationOrigin &&
			!callback.search &&
			!callback.hash &&
			!callback.username &&
			!callback.password &&
			callback.pathname !== '/' &&
			deviceBundleID !== simulatorBundleID
		);
	});

export const readAppEnvironment = () =>
	appEnvironmentSchema.parse(
		JSON.parse(
			readFileSync(fileURLToPath(new URL('./app-environment.json', import.meta.url)), 'utf8')
		)
	);

/** Check the checked-in public deployment assets without replacing other app registrations. */
export const validateAppAssociation = ({ environment, association, callbacks }) => {
	const appID = `${environment.teamID}.${environment.deviceBundleID}`;
	const callback = new URL(environment.authCallbackURL);
	if (
		!association.webcredentials?.apps?.includes(appID) ||
		!association.applinks?.details?.some(
			(detail) =>
				detail.appIDs?.includes(appID) &&
				detail.components?.some(
					(component) => component['/'] === callback.pathname && component.exclude !== true
				)
		) ||
		!callbacks.callbacks?.includes(environment.authCallbackURL)
	) {
		throw new Error('Audit callback/association does not match app-environment.json');
	}
};

export const validateAppBuild = ({ environment, platform, bundleID, teamID, signingAllowed }) => {
	if (platform !== 'iphoneos' && platform !== 'iphonesimulator') {
		throw new Error('Unsupported app build platform');
	}
	const device = platform === 'iphoneos';
	if (
		bundleID !== (device ? environment.deviceBundleID : environment.simulatorBundleID) ||
		(device && signingAllowed !== 'NO' && teamID !== environment.teamID)
	) {
		throw new Error(
			'App bundle/team does not match the audit association; use the generated Audit.xcconfig'
		);
	}
};
