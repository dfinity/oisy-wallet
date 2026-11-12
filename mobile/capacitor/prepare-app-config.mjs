import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
	readAppEnvironment,
	validateAppAssociation,
	validateAppBuild
} from './app-environment.mjs';

const { values } = parseArgs({ options: { 'check-build': { type: 'boolean' } } });
const root = dirname(fileURLToPath(import.meta.url));
const environment = readAppEnvironment();
const deployment = join(root, 'auth-handoff/deployment/audit');
validateAppAssociation({
	environment,
	association: JSON.parse(readFileSync(join(deployment, 'apple-app-site-association'), 'utf8')),
	callbacks: JSON.parse(readFileSync(join(deployment, 'ii-auth-callbacks'), 'utf8'))
});
if (values['check-build']) {
	validateAppBuild({
		environment,
		platform: process.env.PLATFORM_NAME,
		bundleID: process.env.PRODUCT_BUNDLE_IDENTIFIER,
		teamID: process.env.DEVELOPMENT_TEAM,
		signingAllowed: process.env.CODE_SIGNING_ALLOWED
	});
} else {
	const output = join(root, '.native-sdk');
	mkdirSync(output, { recursive: true });
	writeFileSync(
		join(output, 'Audit.xcconfig'),
		[
			'// Generated from app-environment.json. Do not edit.',
			`PRODUCT_BUNDLE_IDENTIFIER[sdk=iphoneos*] = ${environment.deviceBundleID}`,
			`PRODUCT_BUNDLE_IDENTIFIER[sdk=iphonesimulator*] = ${environment.simulatorBundleID}`,
			`DEVELOPMENT_TEAM[sdk=iphoneos*] = ${environment.teamID}`,
			`OISY_NODE_BINARY = ${process.execPath}`,
			''
		].join('\n')
	);
	const domain = new URL(environment.derivationOrigin).hostname;
	writeFileSync(
		join(output, 'App.entitlements'),
		`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>com.apple.developer.associated-domains</key>
  <array><string>applinks:${domain}</string><string>webcredentials:${domain}</string></array>
</dict></plist>
`
	);
	process.stdout.write(
		'Audit app configuration prepared; device and simulator identities are explicit.\n'
	);
}
