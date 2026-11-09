import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleURL = pathToFileURL(join(process.cwd(), 'mobile/capacitor/native-sdk-source.mjs')).href;
const binding = 'languages/swift/Sources/IcpSdkCore/Generated/icp_core.swift';
const invoke = (options: { source: string; revision: string; patch: string }) =>
	spawnSync(
		process.execPath,
		[
			'--input-type=module',
			'-e',
			`const { prepareNativeSDKSource } = await import(process.argv[1]);
     const result = prepareNativeSDKSource(JSON.parse(process.argv[2]));
     process.stdout.write(JSON.stringify(result));`,
			moduleURL,
			JSON.stringify(options)
		],
		{ encoding: 'utf8' }
	);

const fixture = ({ extraGenerated = false }: { extraGenerated?: boolean } = {}) => {
	const directory = mkdtempSync(join(tmpdir(), 'oisy-sdk-source-test-'));
	const source = join(directory, 'sdk');
	mkdirSync(source);
	const write = ({ path, value }: { path: string; value: string }) => {
		mkdirSync(join(source, path, '..'), { recursive: true });
		writeFileSync(join(source, path), value);
	};
	const git = (args: string[]) => {
		const result = spawnSync('git', ['-c', 'commit.gpgsign=false', ...args], {
			cwd: source,
			encoding: 'utf8'
		});
		if (result.status !== 0) {
			throw new Error(result.stderr);
		}
		return result.stdout.trim();
	};
	git(['init', '-q']);
	git(['config', 'user.name', 'SDK fixture']);
	git(['config', 'user.email', 'sdk-fixture@example.invalid']);
	write({
		path: '.gitignore',
		value:
			'languages/swift/Sources/IcpSdkCore/Generated/\nlanguages/swift/Sources/icp_coreFFI/\nIgnored.swift\n'
	});
	write({ path: 'crates/icp-core/src/delegation.rs', value: '// original\n' });
	write({
		path: 'scripts/swift-bindings.sh',
		value: `#!/bin/sh
set -eu
rm -rf languages/swift/Sources/IcpSdkCore/Generated languages/swift/Sources/icp_coreFFI
mkdir -p languages/swift/Sources/IcpSdkCore/Generated languages/swift/Sources/icp_coreFFI
printf '%s' 'fresh patched bindings' > languages/swift/Sources/IcpSdkCore/Generated/icp_core.swift
printf '%s' 'fresh header' > languages/swift/Sources/icp_coreFFI/icp_coreFFI.h
printf '%s' 'fresh module' > languages/swift/Sources/icp_coreFFI/module.modulemap
${extraGenerated ? 'touch languages/swift/Sources/IcpSdkCore/Generated/Extra.swift' : ''}
`
	});
	git(['add', '.']);
	git(['commit', '-qm', 'fixture']);
	const revision = git(['rev-parse', 'HEAD']);
	write({ path: 'crates/icp-core/src/delegation.rs', value: '// original\n// patched\n' });
	const patch = join(directory, 'reviewed.patch');
	writeFileSync(patch, `${git(['diff'])}\n`);
	write({ path: 'crates/icp-core/src/delegation.rs', value: '// original\n' });
	write({ path: binding, value: 'stale unpatched bindings' });
	write({ path: 'languages/swift/Sources/icp_coreFFI/module.modulemap', value: 'already exists' });
	return { source, revision, patch, directory, write };
};

describe('native SDK source preparation', () => {
	const directories: string[] = [];
	const setup = (options?: { extraGenerated?: boolean }) => {
		const value = fixture(options);
		directories.push(value.directory);
		return value;
	};

	afterEach(() =>
		directories
			.splice(0)
			.forEach((directory) => rmSync(directory, { recursive: true, force: true }))
	);

	it('regenerates stale bindings after applying the reviewed patch and records their hashes', () => {
		const value = setup();
		const result = invoke(value);

		expect(result.status).toBe(0);
		expect(readFileSync(join(value.source, binding), 'utf8')).toBe('fresh patched bindings');
		expect(JSON.parse(result.stdout)).toMatchObject({
			revision: value.revision,
			patchSHA256: expect.stringMatching(/^[a-f0-9]{64}$/),
			bindings: { [binding]: expect.stringMatching(/^[a-f0-9]{64}$/) }
		});
		expect(invoke(value).status).toBe(0);
	});

	it.each(['Extra.swift', 'Ignored.swift'])(
		'rejects untracked compilation input %s even when Git ignores it',
		(name) => {
			const value = setup();
			value.write({ path: `languages/swift/Sources/IcpSdkAuth/${name}`, value: '// unreviewed' });
			const result = invoke(value);

			expect(result.status).toBe(1);
			expect(result.stderr).toContain('Unreviewed SDK compilation inputs');
			expect(readFileSync(join(value.source, binding), 'utf8')).toBe('stale unpatched bindings');
		}
	);

	it('rejects tracked edits beyond the reviewed patch before generation', () => {
		const value = setup();
		value.write({ path: 'crates/icp-core/src/delegation.rs', value: '// unrelated modification' });

		expect(invoke(value).status).toBe(1);
		expect(readFileSync(join(value.source, binding), 'utf8')).toBe('stale unpatched bindings');
	});

	it('rejects another source revision', () => {
		const value = setup();
		const result = invoke({ ...value, revision: '0'.repeat(40) });

		expect(result.status).toBe(1);
		expect(result.stderr).toContain('Unexpected native SDK revision');
	});

	it('refuses extra generated Swift files instead of trusting an ignored directory', () => {
		const value = setup({ extraGenerated: true });
		const result = invoke(value);

		expect(result.status).toBe(1);
		expect(result.stderr).toContain('Unexpected generated SDK compilation input');
	});
});
