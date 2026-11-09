import { existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareNativeSDKSource, runSDKCommand, sha256File } from './native-sdk-source.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const cache = join(root, '.native-sdk');
const source = join(cache, 'source');
const revision = 'cc22ba56b6cbab384fcef02c8e3c8624341cc30a';
const patch = join(root, 'auth-handoff/patches/local-session-delegation.patch');
const env = {
	...process.env,
	DEVELOPER_DIR: process.env.DEVELOPER_DIR ?? '/Applications/Xcode.app/Contents/Developer',
	RUSTUP_TOOLCHAIN: process.env.RUSTUP_TOOLCHAIN ?? '1.99.0',
	IPHONEOS_DEPLOYMENT_TARGET: '17.4'
};
const run = ({ command, args, cwd = root, capture = false }) =>
	runSDKCommand({ command, args, cwd, env, capture });
mkdirSync(cache, { recursive: true });
const [, , flag, supplied, ...extra] = process.argv;
if (extra.length || (flag && (flag !== '--source' || !supplied))) {
	throw new Error('Usage: node prepare-native-sdk.mjs [--source VERIFIED_CHECKOUT]');
}
if (!existsSync(source)) {
	if (supplied) {
		symlinkSync(resolve(supplied), source, 'dir');
	} else {
		run({
			command: 'git',
			args: ['clone', 'https://github.com/dfinity/icp-native-sdk.git', source]
		});
		run({ command: 'git', args: ['checkout', '--detach', revision], cwd: source });
	}
}
// Put the selected rustup toolchain ahead of an unrelated Homebrew cargo/rustc.
const cargo = run({ command: 'rustup', args: ['which', 'cargo'], capture: true });
env.PATH = `${dirname(cargo)}:${env.PATH ?? ''}`;
const provenance = prepareNativeSDKSource({ source, revision, patch, env });
const targets = ['aarch64-apple-ios', 'aarch64-apple-ios-sim'];
for (const target of targets) {
	run({ command: 'rustup', args: ['target', 'add', target], cwd: source });
	run({
		command: 'cargo',
		args: [
			'build',
			'--locked',
			'--release',
			'-p',
			'icp-ffi',
			'--target',
			target,
			'--no-default-features',
			'--features',
			'core'
		],
		cwd: source
	});
}
const output = join(cache, 'IcpCore.xcframework');
rmSync(output, { recursive: true, force: true });
run({
	command: 'xcrun',
	args: [
		'xcodebuild',
		'-create-xcframework',
		...targets.flatMap((target) => [
			'-library',
			join(source, 'target', target, 'release/libicp_core.a'),
			'-headers',
			join(source, 'languages/swift/Sources/icp_coreFFI')
		]),
		'-output',
		output
	]
});
writeFileSync(
	join(cache, 'build-provenance.json'),
	`${JSON.stringify(
		{
			...provenance,
			rustc: run({ command: 'rustc', args: ['--version'], cwd: source, capture: true }),
			swift: run({ command: 'xcrun', args: ['swift', '--version'], capture: true }),
			libraries: Object.fromEntries(
				targets.map((target) => [
					target,
					sha256File(join(source, 'target', target, 'release/libicp_core.a'))
				])
			)
		},
		null,
		2
	)}\n`
);
process.stdout.write('Pinned SDK and build provenance prepared. Run npm run mobile:sync:ios.\n');
