import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const compilationInputs = [
	'Cargo.toml',
	'Cargo.lock',
	'rust-toolchain.toml',
	'Package.swift',
	'.cargo',
	'crates',
	'languages/swift/Sources',
	'scripts',
	'vendor'
];
const generatedDirectories = [
	'languages/swift/Sources/IcpSdkCore/Generated/',
	'languages/swift/Sources/icp_coreFFI/'
];
const generatedFiles = [
	'languages/swift/Sources/IcpSdkCore/Generated/icp_core.swift',
	'languages/swift/Sources/icp_coreFFI/icp_coreFFI.h',
	'languages/swift/Sources/icp_coreFFI/module.modulemap'
];
export const sha256File = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
export const runSDKCommand = ({ command, args, cwd, env = process.env, capture = false }) => {
	const result = spawnSync(command, args, {
		cwd,
		env,
		encoding: 'utf8',
		stdio: capture ? 'pipe' : 'inherit'
	});
	if (result.status !== 0) {
		throw new Error(`${command} failed: ${capture ? result.stderr : 'see output'}`);
	}
	return result.stdout?.trim() ?? '';
};

/** Only the pinned tracked tree plus its reviewed patch may enter compilation. */
export const verifyNativeSDKSource = ({ source, revision, patch, env = process.env }) => {
	const git = (args) => runSDKCommand({ command: 'git', args, cwd: source, env, capture: true });
	if (git(['rev-parse', 'HEAD']) !== revision) {
		throw new Error('Unexpected native SDK revision');
	}
	// Also inspect ignored source files: git diff alone misses extra Swift/C/Rust inputs.
	const extra = [
		...git(['ls-files', '--others', '--exclude-standard', '-z', '--', ...compilationInputs]).split(
			'\0'
		),
		...git([
			'ls-files',
			'--others',
			'--ignored',
			'--exclude-standard',
			'-z',
			'--',
			...compilationInputs
		]).split('\0')
	].filter((file) => file && !generatedDirectories.some((directory) => file.startsWith(directory)));
	if (extra.length) {
		throw new Error(`Unreviewed SDK compilation inputs: ${extra.join(', ')}`);
	}
	const applied =
		spawnSync('git', ['apply', '--reverse', '--check', patch], {
			cwd: source,
			env,
			stdio: 'ignore'
		}).status === 0;
	if (!applied) {
		git(['diff', '--exit-code', 'HEAD']);
		git(['apply', '--check', patch]);
		git(['apply', patch]);
	}
	const validation = mkdtempSync(join(tmpdir(), 'oisy-sdk-index-'));
	try {
		for (const args of [
			['read-tree', 'HEAD'],
			['apply', '--cached', patch],
			['diff', '--exit-code']
		]) {
			runSDKCommand({
				command: 'git',
				args,
				cwd: source,
				env: { ...env, GIT_INDEX_FILE: join(validation, 'index') },
				capture: true
			});
		}
	} finally {
		rmSync(validation, { recursive: true, force: true });
	}
};

export const prepareNativeSDKSource = ({ source, revision, patch, env = process.env }) => {
	verifyNativeSDKSource({ source, revision, patch, env });
	// The local patch adds a UniFFI export. Existing module maps cannot prove that
	// generated Swift/C bindings match it; regenerate even in a reused checkout.
	runSDKCommand({ command: 'bash', args: ['scripts/swift-bindings.sh'], cwd: source, env });
	verifyNativeSDKSource({ source, revision, patch, env });
	for (const directory of generatedDirectories) {
		const path = join(source, directory);
		if (lstatSync(path).isSymbolicLink()) {
			throw new Error('Generated SDK bindings must be local files');
		}
		const actual = readdirSync(path, { recursive: true }).map((name) => directory + name);
		if (actual.some((file) => !generatedFiles.includes(file))) {
			throw new Error('Unexpected generated SDK compilation input');
		}
	}
	const bindings = Object.fromEntries(
		generatedFiles.map((file) => {
			const path = join(source, file);
			if (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink()) {
				throw new Error('Generated SDK bindings must be local files');
			}
			return [file, sha256File(path)];
		})
	);
	return { revision, patchSHA256: sha256File(patch), bindings };
};
