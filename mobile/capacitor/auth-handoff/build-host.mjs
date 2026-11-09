import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// The standalone host shares the app's validated public config; it has no frontend aliases.
// eslint-disable-next-line import/no-relative-parent-imports
import { readAppEnvironment } from '../app-environment.mjs';

const source = dirname(fileURLToPath(import.meta.url));
const environment = readAppEnvironment();
const domain = new URL(environment.derivationOrigin).hostname;
const [sdkArgument, cacheArgument, target] = process.argv.slice(2);
if ((target && target !== '--device') || process.argv.length > 5) {
	throw new Error('Supported target: --device; omit for simulator');
}
const device = target === '--device';
if (!sdkArgument || !cacheArgument) {
	throw new Error('Usage: node build-host.mjs SDK_CHECKOUT VERIFIED_TEST_CACHE [--device]');
}
const sdk = resolve(sdkArgument);
const cache = resolve(cacheArgument);
const revision = spawnSync('git', ['-C', sdk, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
if (
	revision.status !== 0 ||
	revision.stdout.trim() !== 'cc22ba56b6cbab384fcef02c8e3c8624341cc30a'
) {
	throw new Error('Unexpected native SDK revision');
}
const output = mkdtempSync(join(cache, 'ios-host-'));
const web = join(output, 'Web');
mkdirSync(web);

const run = ({ command, args }) => {
	const result = spawnSync(command, args, {
		cwd: output,
		stdio: 'inherit',
		env: {
			...process.env,
			DEVELOPER_DIR: process.env.DEVELOPER_DIR ?? '/Applications/Xcode.app/Contents/Developer'
		}
	});
	if (result.status !== 0) {
		throw new Error(`${command} failed`);
	}
};

// Build only the pinned dependency version already installed by verify.sh.
for (const [name, expected] of [
	['auth', '11.1.0'],
	['core', '6.0.0']
]) {
	const manifest = JSON.parse(
		readFileSync(join(cache, 'node_modules/@icp-sdk', name, 'package.json'), 'utf8')
	);
	if (manifest.version !== expected) {
		throw new Error('Unexpected SDK dependency');
	}
}
mkdirSync(join(cache, 'session-sdk'), { recursive: true });
for (const name of ['session.ts', 'compatible-request.ts']) {
	copyFileSync(join(source, '../session-sdk', name), join(cache, 'session-sdk', name));
}
copyFileSync(join(source, '../app-environment.json'), join(cache, 'app-environment.json'));
writeFileSync(join(cache, 'session.ts'), "export * from './session-sdk/session.js';\n");
copyFileSync(join(source, 'web/handoff.ts'), join(cache, 'handoff.ts'));
copyFileSync(join(source, 'web/handoff.html'), join(web, 'handoff.html'));
await build({
	entryPoints: [join(cache, 'handoff.ts')],
	bundle: true,
	platform: 'browser',
	format: 'iife',
	target: 'safari17.4',
	outfile: join(web, 'handoff.js')
});

run({
	command: 'xcrun',
	args: [
		'xcodebuild',
		'-create-xcframework',
		'-library',
		join(
			sdk,
			device ? 'target/aarch64-apple-ios/release/libicp_core.a' : 'out/swift-ios/lib/libicp_core.a'
		),
		'-headers',
		join(sdk, 'languages/swift/Sources/icp_coreFFI'),
		'-output',
		join(output, 'IcpCore.xcframework')
	]
});
const spec = {
	name: 'OisyAuthHandoff',
	options: { deploymentTarget: { iOS: '17.4' } },
	packages: { IcpSdkCore: { path: sdk } },
	targets: {
		OisyAuthHandoff: {
			type: 'application',
			platform: 'iOS',
			sources: [
				join(source, 'ios/HandoffApp.swift'),
				join(source, 'native/DelegationJSON.swift'),
				{ path: web, type: 'folder', buildPhase: 'resources' }
			],
			dependencies: ['IcpSdkCore', 'IcpSdkSigner', 'IcpSdkAuth']
				.map((product) => ({ package: 'IcpSdkCore', product }))
				.concat([{ framework: join(output, 'IcpCore.xcframework'), embed: false }]),
			info: {
				path: 'Info.plist',
				properties: { CFBundleDisplayName: 'OISY Auth Test', UILaunchScreen: {} }
			},
			entitlements: {
				path: 'Handoff.entitlements',
				properties: {
					'com.apple.developer.associated-domains': [
						`applinks:${domain}`,
						`webcredentials:${domain}`
					]
				}
			},
			settings: {
				base: {
					PRODUCT_BUNDLE_IDENTIFIER: environment.deviceBundleID,
					DEVELOPMENT_TEAM: environment.teamID,
					CODE_SIGN_STYLE: 'Automatic',
					SWIFT_VERSION: '6.0',
					SWIFT_STRICT_CONCURRENCY: 'complete',
					TARGETED_DEVICE_FAMILY: '1',
					GENERATE_INFOPLIST_FILE: 'NO'
				}
			}
		}
	}
};
writeFileSync(join(output, 'project.json'), JSON.stringify(spec, null, 2));
run({
	command: 'xcodegen',
	args: ['generate', '--spec', join(output, 'project.json'), '--project', output]
});
run({
	command: 'xcrun',
	args: [
		'xcodebuild',
		'-project',
		join(output, 'OisyAuthHandoff.xcodeproj'),
		'-scheme',
		'OisyAuthHandoff',
		'-destination',
		device ? 'generic/platform=iOS' : 'generic/platform=iOS Simulator',
		'-derivedDataPath',
		join(output, 'DerivedData'),
		'ARCHS=arm64',
		'ONLY_ACTIVE_ARCH=YES',
		...(device ? ['CODE_SIGNING_ALLOWED=NO'] : []),
		'build'
	]
});
process.stdout.write(
	`Built ${device ? 'unsigned device' : 'simulator'} test host: ${join(output, `DerivedData/Build/Products/Debug-${device ? 'iphoneos' : 'iphonesimulator'}/OisyAuthHandoff.app`)}\n`
);
