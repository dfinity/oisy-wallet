import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
// Shared multi-chain loaders need the same HTTPS/WSS endpoints as the web app.
// Executable code remains bundled; third-party dApps never receive this bridge.
const policy =
	"default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self' data:; connect-src 'self' https: wss:; worker-src 'self' blob:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'";
const htmlFiles = readdirSync('build-mobile', { recursive: true }).filter((file) =>
	file.endsWith('.html')
);
for (const file of htmlFiles) {
	const path = `build-mobile/${file}`;
	writeFileSync(
		path,
		readFileSync(path, 'utf8').replace(
			'<head>',
			`<head><meta http-equiv="Content-Security-Policy" content="${policy}">`
		)
	);
}
writeFileSync(
	'build-mobile/mobile-build.json',
	`${JSON.stringify(
		{
			version: pkg.version,
			revision,
			dirty: execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).length > 0,
			capacitor: pkg.dependencies['@capacitor/core'],
			contract: 2,
			environment: 'audit',
			mode: 'audit-read-only',
			builtAt: new Date().toISOString()
		},
		null,
		2
	)}\n`
);
