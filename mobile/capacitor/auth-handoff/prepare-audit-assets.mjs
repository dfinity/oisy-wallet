import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
	options: { domain: { type: 'string' }, 'out-dir': { type: 'string' } }
});
// Share the canonical environment mapping; duplicating it could publish audit identity on another host.
// eslint-disable-next-line import/no-relative-parent-imports
const domain = values.domain ?? (await import('../../../scripts/build.utils.mjs')).OISY_IC_DOMAIN;
const output = join(resolve(values['out-dir'] ?? 'build'), '.well-known');
const source = join(dirname(fileURLToPath(import.meta.url)), 'deployment/audit');
const names = ['apple-app-site-association', 'ii-auth-callbacks', 'assetlinks.json'];

if (domain !== 'https://audit.oisy.com') {
	// Refuse stale output or another owner's association; never erase registrations.
	if (names.some((name) => existsSync(join(output, name)))) {
		throw new Error(
			'Audit auth assets found in a non-audit build. Use a clean build directory and review domain ownership.'
		);
	}
} else {
	mkdirSync(output, { recursive: true });
	for (const name of names) {
		copyFileSync(join(source, name), join(output, name));
	}
}
