#!/usr/bin/env node

/**
 * Browser-memory benchmark for the built frontend.
 *
 * Measures, against the production build in `build/`:
 *  1. Landing page (logged out): JS heap, DOM nodes and total JS transferred.
 *  2. Worker scaling: spawns N instances of the real built wallet-worker
 *     bundle (the app spawns roughly one per enabled ICRC/BTC/SOL token) and
 *     reports the marginal memory cost per worker, plus an empty-worker
 *     control to separate V8-isolate baseline from bundle parse/init cost.
 *
 * Per-process memory (PSS) is read from /proc, so the process-level numbers
 * are only available on Linux; on other platforms the JS-heap numbers are
 * still reported.
 *
 * Usage:
 *   npm run build            # any DFX_NETWORK; the bundle is what matters
 *   npm run perf:memory      # or: node scripts/perf.memory.mjs [--json]
 *
 * Env:
 *   PERF_MEMORY_CHROMIUM     Path to a Chromium executable, for environments
 *                            where the Playwright-managed download is absent.
 *   PERF_MEMORY_WORKERS      Max workers for the scaling phase (default 50).
 */

import { chromium } from '@playwright/test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';

const BUILD_DIR = join(process.cwd(), 'build');
const MAX_WORKERS = Number(process.env.PERF_MEMORY_WORKERS ?? 50);
const JSON_OUTPUT = process.argv.includes('--json');

const MIME = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.woff2': 'font/woff2',
	'.ico': 'image/x-icon',
	'.wasm': 'application/wasm'
};

const startServer = () =>
	new Promise((resolve) => {
		// eslint-disable-next-line local-rules/prefer-object-params -- Node http handler signature
		const server = createServer(async ({ url }, res) => {
			try {
				let file = join(BUILD_DIR, decodeURIComponent(new URL(url, 'http://x').pathname));
				try {
					if ((await stat(file)).isDirectory()) {
						file = join(file, 'index.html');
					}
				} catch {
					// SPA fallback
					file = join(BUILD_DIR, 'index.html');
				}
				const data = await readFile(file);
				res.writeHead(200, {
					'content-type': MIME[extname(file)] ?? 'application/octet-stream'
				});
				res.end(data);
			} catch {
				res.writeHead(404);
				res.end();
			}
		});
		server.listen(0, '127.0.0.1', () => resolve(server));
	});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Sum proportional-set-size of the Chromium processes, grouped by process
// type. Linux-only; returns undefined elsewhere.
const chromiumPssKb = () => {
	if (process.platform !== 'linux') {
		return undefined;
	}

	const byType = {};
	for (const pid of readdirSync('/proc').filter((entry) => /^\d+$/.test(entry))) {
		try {
			const cmd = readFileSync(`/proc/${pid}/cmdline`, 'utf8');
			if (cmd.includes('chrom')) {
				const type = cmd.match(/--type=([a-z-]+)/)?.[1] ?? 'browser';
				const pss = Number(
					readFileSync(`/proc/${pid}/smaps_rollup`, 'utf8').match(/^Pss:\s+(\d+) kB/m)?.[1] ?? 0
				);
				byType[type] = (byType[type] ?? 0) + pss;
			}
		} catch {
			// process exited while reading — ignore
		}
	}
	return byType;
};

const rendererPssKb = () => chromiumPssKb()?.renderer;

const toMb = (kb) => Math.round((kb / 1024) * 10) / 10;

const measureLanding = async ({ browser, baseUrl }) => {
	const context = await browser.newContext();
	const page = await context.newPage();

	let jsTransferred = 0;
	let jsFiles = 0;
	page.on('response', async (response) => {
		try {
			if (new URL(response.url()).pathname.endsWith('.js')) {
				jsTransferred += (await response.body()).length;
				jsFiles += 1;
			}
		} catch {
			// response body unavailable (e.g. redirect) — ignore
		}
	});

	const cdp = await context.newCDPSession(page);
	await cdp.send('Performance.enable');

	await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 120_000 });
	await sleep(5000);

	const { metrics } = await cdp.send('Performance.getMetrics');
	const metric = (name) => metrics.find(({ name: n }) => n === name)?.value ?? 0;

	const result = {
		jsHeapUsedMb: toMb(metric('JSHeapUsedSize') / 1024),
		jsHeapTotalMb: toMb(metric('JSHeapTotalSize') / 1024),
		domNodes: metric('Nodes'),
		jsTransferredMb: toMb(jsTransferred / 1024),
		jsFiles,
		rendererPssMb: rendererPssKb() !== undefined ? toMb(rendererPssKb()) : undefined
	};

	await context.close();
	return result;
};

const measureWorkerScaling = async ({ browser, baseUrl, workerUrl, useRealBundle }) => {
	const context = await browser.newContext();
	const page = await context.newPage();
	await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
	await sleep(2000);

	const start = rendererPssKb();

	await page.evaluate(
		async ({ url, count, real }) => {
			const workerSrc = real
				? url
				: URL.createObjectURL(new Blob(['self.onmessage=()=>{};'], { type: 'text/javascript' }));
			window.__perfWorkers = [];
			for (let i = 0; i < count; i++) {
				window.__perfWorkers.push(new Worker(workerSrc, real ? { type: 'module' } : undefined));
			}
			// allow parse + module init to settle
			await new Promise((resolve) => setTimeout(resolve, 200 * count + 3000));
		},
		{ url: workerUrl, count: MAX_WORKERS, real: useRealBundle }
	);
	await sleep(4000);

	const end = rendererPssKb();
	await context.close();

	if (start === undefined || end === undefined) {
		return { workers: MAX_WORKERS, note: 'PSS unavailable on this platform' };
	}

	return {
		workers: MAX_WORKERS,
		totalMb: toMb(end - start),
		perWorkerMb: toMb((end - start) / MAX_WORKERS)
	};
};

const main = async () => {
	if (!existsSync(join(BUILD_DIR, 'index.html'))) {
		console.error('No build/ output found. Run `npm run build` first.');
		process.exit(1);
	}

	const workersDir = join(BUILD_DIR, '_app', 'immutable', 'workers');
	const workerFile = existsSync(workersDir)
		? readdirSync(workersDir).find((file) => file.endsWith('.js'))
		: undefined;
	if (!workerFile) {
		console.error('No worker bundle found under build/_app/immutable/workers.');
		process.exit(1);
	}

	const server = await startServer();
	const baseUrl = `http://127.0.0.1:${server.address().port}/`;

	const browser = await chromium.launch({
		headless: true,
		executablePath: process.env.PERF_MEMORY_CHROMIUM,
		args: ['--no-sandbox']
	});

	try {
		const landing = await measureLanding({ browser, baseUrl });
		const realWorkers = await measureWorkerScaling({
			browser,
			baseUrl,
			workerUrl: `/_app/immutable/workers/${workerFile}`,
			useRealBundle: true
		});
		const emptyWorkers = await measureWorkerScaling({
			browser,
			baseUrl,
			workerUrl: `/_app/immutable/workers/${workerFile}`,
			useRealBundle: false
		});

		const report = {
			landing,
			realWorkers,
			emptyWorkersControl: emptyWorkers,
			workerBundle: workerFile
		};

		if (JSON_OUTPUT) {
			console.log(JSON.stringify(report, null, 2));
			return;
		}

		console.log('\nBrowser memory benchmark (production build)');
		console.log('===========================================');
		console.log(`Landing page (logged out):`);
		console.log(`  JS heap used / total: ${landing.jsHeapUsedMb} / ${landing.jsHeapTotalMb} MB`);
		console.log(`  DOM nodes:            ${landing.domNodes}`);
		console.log(`  JS transferred:       ${landing.jsTransferredMb} MB (${landing.jsFiles} files)`);
		if (landing.rendererPssMb !== undefined) {
			console.log(`  Renderer PSS:         ${landing.rendererPssMb} MB`);
		}
		console.log(`\nWorker scaling (${realWorkers.workers} workers, bundle ${workerFile}):`);
		if (realWorkers.perWorkerMb !== undefined) {
			console.log(
				`  Real worker bundle:   ${realWorkers.perWorkerMb} MB/worker (total +${realWorkers.totalMb} MB)`
			);
			console.log(
				`  Empty worker control: ${emptyWorkers.perWorkerMb} MB/worker (total +${emptyWorkers.totalMb} MB)`
			);
			console.log(
				`  → bundle parse/init:  ~${Math.round((realWorkers.perWorkerMb - emptyWorkers.perWorkerMb) * 10) / 10} MB/worker attributable to the worker bundle`
			);
		} else {
			console.log(
				'  Process-level PSS is only measured on Linux; JS-heap metrics above still apply.'
			);
		}
		console.log(
			'\nThe app spawns roughly one wallet worker per enabled ICRC/BTC/SOL token (see WalletWorkers.svelte), so multiply the per-worker cost by the token count to estimate steady-state usage.'
		);
	} finally {
		await browser.close();
		server.close();
	}
};

await main();
