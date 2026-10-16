// Serves the test dapp on http://localhost:8090. ethers comes from the repo's own node_modules, so
// the page needs no CDN and no new dependency.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT ?? 8090);
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..');

const ROUTES = {
	'/': { file: join(here, 'index.html'), type: 'text/html' },
	'/test-dapp.js': { file: join(here, 'test-dapp.js'), type: 'text/javascript' },
	'/vendor/ethers.js': {
		file: join(repoRoot, 'node_modules', 'ethers', 'dist', 'ethers.min.js'),
		type: 'text/javascript'
	}
};

// eslint-disable-next-line local-rules/prefer-object-params -- Node http callback signature
createServer(async (request, response) => {
	const { pathname } = new URL(request.url ?? '/', 'http://localhost');
	const route = ROUTES[pathname];

	if (route === undefined) {
		response.writeHead(404).end('Not found');
		return;
	}

	try {
		const body = await readFile(route.file);
		response
			.writeHead(200, {
				'Content-Type': `${route.type}; charset=utf-8`,
				'Cache-Control': 'no-store'
			})
			.end(body);
	} catch (_) {
		response.writeHead(500).end('Could not read the file');
	}
}).listen(PORT, '127.0.0.1', () =>
	process.stdout.write(`OISY extension test dapp: http://localhost:${PORT}\n`)
);
