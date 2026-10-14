// Loads the unpacked extension into Playwright's Chromium and checks the relay up to the point where
// a person has to sign in to OISY. Needs the OISY dev server against staging on :5175 and the test
// dapp on :8090. Run: node src/extension/scripts/smoke.js   (HEADED=1 to watch it)
import { chromium } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXTENSION_ID = 'fcdljkamhcheddlldbaffbpiopkcjcog';
const DAPP_URL = 'http://localhost:8090/';
const OISY_ORIGIN = 'http://localhost:5175';
const SCREENSHOT_DIR = process.env.SMOKE_SCREENSHOTS ?? tmpdir();

const extensionPath = join(dirname(fileURLToPath(import.meta.url)), '..');

const results = [];

const check = ({ name, ok, detail }) => {
	results.push({ name, ok });
	process.stdout.write(
		`${ok ? 'PASS' : 'FAIL'}  ${name}${detail === undefined ? '' : `  (${detail})`}\n`
	);
};

// Talks to the extension the way a page does, to prove who it will and will not answer.
const probeExtension = ({ page, id }) =>
	page.evaluate(
		({ extensionId, requestId }) =>
			new Promise((resolve) => {
				const connect = globalThis.chrome?.runtime?.connect;
				if (typeof connect !== 'function') {
					resolve({ unreachable: true });
					return;
				}
				const port = globalThis.chrome.runtime.connect(extensionId, { name: 'probe' });
				port.onMessage.addListener((message) => resolve(message));
				port.onDisconnect.addListener(() => resolve({ disconnected: true }));
				port.postMessage({ type: 'get-request', id: requestId });
				setTimeout(() => resolve({ timeout: true }), 3000);
			}),
		{ extensionId: EXTENSION_ID, requestId: id }
	);

const userDataDir = await mkdtemp(join(tmpdir(), 'oisy-extension-smoke-'));
const context = await chromium.launchPersistentContext(userDataDir, {
	channel: 'chromium',
	headless: process.env.HEADED !== '1',
	args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`]
});

try {
	const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
	const workerId = new URL(worker.url()).host;
	check({
		name: 'extension loads with the fixed ID',
		ok: workerId === EXTENSION_ID,
		detail: workerId
	});

	const dapp = await context.newPage();
	await dapp.goto(DAPP_URL);
	await dapp.waitForFunction(() => window.oisyTest?.eth && window.oisyTest?.sol, null, {
		timeout: 10_000
	});
	const wallets = await dapp.evaluate(() => window.oisyTest.wallets);
	check({
		name: 'dapp finds OISY through EIP-6963',
		ok: wallets.some((wallet) => wallet === 'OISY · EIP-6963 · com.oisy'),
		detail: wallets.join(' | ')
	});
	check({
		name: 'dapp finds OISY through the Wallet Standard',
		ok: wallets.some((wallet) => wallet === 'OISY · Wallet Standard · solana:devnet')
	});
	await dapp.screenshot({ path: join(SCREENSHOT_DIR, 'test-dapp-wallets-found.png') });

	const ethCall = ({ method, params }) =>
		dapp.evaluate(
			async (request) => {
				try {
					return { result: await window.oisyTest.eth.request(request) };
				} catch (err) {
					return { code: err.code, message: err.message };
				}
			},
			{ method, params }
		);

	const chainId = await ethCall({ method: 'eth_chainId' });
	check({
		name: 'eth_chainId is Sepolia',
		ok: chainId.result === '0xaa36a7',
		detail: chainId.result
	});

	const accounts = await ethCall({ method: 'eth_accounts' });
	check({
		name: 'eth_accounts is empty before connecting',
		ok: Array.isArray(accounts.result) && accounts.result.length === 0
	});

	const unauthorizedSign = await ethCall({
		method: 'personal_sign',
		params: ['0x68656c6c6f', '0x0']
	});
	check({
		name: 'signing before connecting is refused without a popup',
		ok: unauthorizedSign.code === 4100,
		detail: unauthorizedSign.code
	});

	const mainnet = await ethCall({
		method: 'wallet_switchEthereumChain',
		params: [{ chainId: '0x1' }]
	});
	check({
		name: 'switching to mainnet is refused',
		ok: mainnet.code === 4902,
		detail: mainnet.code
	});

	const blockNumber = await ethCall({ method: 'eth_blockNumber' });
	check({
		name: 'read-only calls are answered from a Sepolia node',
		ok: typeof blockNumber.result === 'string' && blockNumber.result.startsWith('0x'),
		detail: blockNumber.result ?? blockNumber.message
	});

	const silentSol = await dapp.evaluate(async () => {
		const { accounts } = await window.oisyTest.sol.features['standard:connect'].connect({
			silent: true
		});
		return accounts.length;
	});
	check({ name: 'silent Solana connect returns no account', ok: silentSol === 0 });

	const dappProbe = await probeExtension({ page: dapp, id: 'anything' });
	check({
		name: 'a dapp page cannot pose as OISY',
		ok: dappProbe.disconnected === true,
		detail: JSON.stringify(dappProbe)
	});

	const popupOpened = context.waitForEvent('page', { timeout: 15_000 });
	const connect = ethCall({ method: 'eth_requestAccounts' });
	const popup = await popupOpened;
	await popup.waitForLoadState('domcontentloaded');
	const popupUrl = new URL(popup.url());
	const requestId = popupUrl.searchParams.get('request');
	check({
		name: 'connect opens the OISY popup on /extension/',
		ok:
			popupUrl.origin === OISY_ORIGIN && popupUrl.pathname === '/extension/' && requestId !== null,
		detail: popup.url()
	});

	const second = await ethCall({ method: 'eth_requestAccounts' });
	check({
		name: 'a second request while the popup is open is refused',
		ok: second.code === -32002,
		detail: second.code
	});

	const otherTab = await context.newPage();
	await otherTab.goto(`${OISY_ORIGIN}/robots.txt`);
	const otherTabProbe = await probeExtension({ page: otherTab, id: requestId });
	check({
		name: 'another OISY tab cannot read the open request',
		ok: otherTabProbe.type === 'request' && otherTabProbe.request === null,
		detail: JSON.stringify(otherTabProbe)
	});
	await otherTab.close();

	const popupProbe = await probeExtension({ page: popup, id: requestId });
	check({
		name: 'the popup itself can read the open request',
		ok:
			popupProbe.request?.kind === 'connect' &&
			popupProbe.request?.origin === 'http://localhost:8090',
		detail: JSON.stringify(popupProbe.request)
	});

	await popup.reload();
	const reloadedProbe = await probeExtension({ page: popup, id: requestId });
	check({
		name: 'reloading the popup keeps the request',
		ok: reloadedProbe.request?.id === requestId
	});

	await popup.waitForTimeout(4000);
	await popup.screenshot({ path: join(SCREENSHOT_DIR, 'oisy-popup-signed-out.png') });
	await popup.close();

	const rejected = await connect;
	check({
		name: 'closing the popup rejects the request with 4001',
		ok: rejected.code === 4001,
		detail: rejected.code
	});

	// A reload drops the dapp's port, so its answer could otherwise reach whatever page loads next.
	const secondPopupOpened = context.waitForEvent('page', { timeout: 15_000 });
	ethCall({ method: 'eth_requestAccounts' }).catch(() => undefined);
	const secondPopup = await secondPopupOpened;
	const secondPopupClosed = secondPopup
		.waitForEvent('close', { timeout: 5000 })
		.then(() => true)
		.catch(() => false);
	await dapp.reload();
	check({ name: 'reloading the dapp closes its open popup', ok: await secondPopupClosed });

	const toolbar = await context.newPage();
	await toolbar.setViewportSize({ width: 372, height: 300 });
	await toolbar.goto(`chrome-extension://${EXTENSION_ID}/popup.html`);
	const emptyShown = await toolbar
		.waitForSelector('#empty:not([hidden])', { timeout: 5000 })
		.then(() => true)
		.catch(() => false);
	check({ name: 'toolbar popup shows the not-connected state', ok: emptyShown });
	await toolbar.screenshot({ path: join(SCREENSHOT_DIR, 'toolbar-not-connected.png') });
} finally {
	await context.close();
	await rm(userDataDir, { recursive: true, force: true });
}

const failed = results.filter(({ ok }) => !ok);
process.stdout.write(`\n${results.length - failed.length}/${results.length} checks passed\n`);
process.exit(failed.length === 0 ? 0 : 1);
