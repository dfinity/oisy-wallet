// Loads the unpacked extension into Playwright's Chromium and checks the relay up to the point where
// a person has to sign in to OISY. Needs the OISY dev server against staging on :5175 and the test
// dapp on :8090. Run: node src/extension/scripts/smoke.js   (HEADED=1 to watch it)
import { chromium } from '@playwright/test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXTENSION_ID = 'fcdljkamhcheddlldbaffbpiopkcjcog';
const DAPP_URL = 'http://localhost:8090/';
const OISY_ORIGIN = 'http://localhost:5175';
const SCREENSHOT_DIR = process.env.SMOKE_SCREENSHOTS ?? tmpdir();

const extensionPath = join(dirname(fileURLToPath(import.meta.url)), '..');
const { version: EXTENSION_VERSION } = JSON.parse(
	await readFile(join(extensionPath, 'manifest.json'), 'utf8')
);

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
		name: 'the extension reports its version to OISY',
		ok: popupProbe.version === EXTENSION_VERSION,
		detail: popupProbe.version
	});
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

	const signInShown = await popup
		.getByText('Open or create your wallet', { exact: false })
		.waitFor({ timeout: 20_000 })
		.then(() => true)
		.catch(() => false);
	check({ name: 'the signed-out popup shows the OISY sign-in', ok: signInShown });

	const navigationCount = await popup.locator('nav, footer, header').count();
	check({
		name: 'the popup shows no app navigation, header or footer',
		ok: navigationCount === 0,
		detail: navigationCount
	});

	await popup.setViewportSize({ width: 420, height: 720 });
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

	const panelBehavior = await worker.evaluate(() => globalThis.chrome.sidePanel.getPanelBehavior());
	check({
		name: 'the toolbar icon opens the side panel',
		ok: panelBehavior?.openPanelOnActionClick === true
	});

	// Playwright can't click the browser's own toolbar, so the panel page is opened as a tab at a
	// typical side panel width. Framing and storage rules are the same as in the real panel.
	const panel = await context.newPage();
	await panel.setViewportSize({ width: 360, height: 720 });
	const panelStarted = Date.now();
	await panel.goto(`chrome-extension://${EXTENSION_ID}/sidepanel.html`);
	const panelReady = await panel
		.waitForSelector('#oisy:not([hidden])', { timeout: 30_000 })
		.then(() => true)
		.catch(() => false);
	const panelFrame = panel
		.frames()
		.find((frame) => frame.url().startsWith(`${OISY_ORIGIN}/extension/panel/`));
	const panelSignIn =
		panelReady &&
		panelFrame !== undefined &&
		(await panelFrame
			.getByText('Open or create your wallet', { exact: false })
			.waitFor({ timeout: 20_000 })
			.then(() => true)
			.catch(() => false));
	check({
		name: "the side panel shows OISY's page, signed out",
		ok: panelSignIn,
		detail: `${Date.now() - panelStarted} ms`
	});
	await panel.screenshot({ path: join(SCREENSHOT_DIR, 'side-panel-oisy-signed-out.png') });

	const panelState =
		panelFrame === undefined
			? null
			: await panelFrame.evaluate(
					(extensionId) =>
						new Promise((resolve) => {
							const port = globalThis.chrome.runtime.connect(extensionId, { name: 'oisy-panel' });
							port.onMessage.addListener((message) => resolve(message));
							port.postMessage({ type: 'get-state' });
							setTimeout(() => resolve(null), 3000);
						}),
					EXTENSION_ID
				);
	check({
		name: "OISY's page in the panel gets the extension's state",
		ok: panelState?.type === 'state' && panelState?.version === EXTENSION_VERSION,
		detail: JSON.stringify(panelState)
	});

	// Drives the panel protocol from OISY's page the way the signed-in panel does, then reads the
	// state the extension settles on.
	const panelCall = (messages) =>
		panelFrame === undefined
			? null
			: panelFrame.evaluate(
					({ extensionId, messages }) =>
						new Promise((resolve) => {
							const port = globalThis.chrome.runtime.connect(extensionId, { name: 'oisy-panel' });
							messages.forEach((message) => port.postMessage(message));
							setTimeout(() => {
								port.onMessage.addListener((message) => {
									if (message.type === 'state') {
										port.disconnect();
										resolve(message.state);
									}
								});
								port.postMessage({ type: 'get-state' });
							}, 300);
							setTimeout(() => resolve(null), 3000);
						}),
					{ extensionId: EXTENSION_ID, messages }
				);

	const solAccountCount = () =>
		dapp.evaluate(async () => {
			const { accounts } = await window.oisyTest.sol.features['standard:connect'].connect({
				silent: true
			});
			return accounts.length;
		});

	const account = {
		eth: '0x000000000000000000000000000000000000dEaD',
		sol: 'So11111111111111111111111111111111111111112'
	};
	const dappOrigin = new URL(DAPP_URL).origin;

	await panelCall([{ type: 'set-account', account }]);
	// Stands in for the dapp's approved connect requests, which need a signed-in popup.
	await worker.evaluate(async (origin) => {
		const { state } = await globalThis.chrome.storage.local.get('state');
		await globalThis.chrome.storage.local.set({
			state: { ...state, sites: { [origin]: { eth: true, sol: true } } }
		});
	}, dappOrigin);
	await dapp.bringToFront();

	const connectedState = await panelCall([]);
	check({
		name: 'the panel learns which site is in the active tab',
		ok: connectedState?.activeOrigin === dappOrigin,
		detail: connectedState?.activeOrigin
	});

	// An open panel is told about tab switches without asking.
	const pushedOrigin = panelFrame.evaluate(
		(extensionId) =>
			new Promise((resolve) => {
				const port = globalThis.chrome.runtime.connect(extensionId, { name: 'oisy-panel' });
				port.onMessage.addListener((message) => {
					if (message.type === 'state' && message.state.activeOrigin === null) {
						port.disconnect();
						resolve(null);
					}
				});
				setTimeout(() => resolve('no push'), 3000);
			}),
		EXTENSION_ID
	);
	await new Promise((resolve) => setTimeout(resolve, 300));
	await panel.bringToFront();
	check({
		name: 'switching tabs updates the site the panel shows',
		ok: (await pushedOrigin) === null
	});
	await dapp.bringToFront();

	const connectedAccounts = await ethCall({ method: 'eth_accounts' });
	check({
		name: 'a connected dapp sees the account',
		ok: connectedAccounts.result?.[0] === account.eth && (await solAccountCount()) === 1
	});

	const lockedState = await panelCall([{ type: 'lock' }]);
	const lockedAccounts = await ethCall({ method: 'eth_accounts' });
	check({
		name: 'logging out locks the extension: sites see no account',
		ok:
			lockedState?.locked === true &&
			Array.isArray(lockedAccounts.result) &&
			lockedAccounts.result.length === 0 &&
			(await solAccountCount()) === 0,
		detail: JSON.stringify(lockedAccounts.result)
	});

	const lockedSign = await ethCall({
		method: 'personal_sign',
		params: ['0x68656c6c6f', account.eth]
	});
	check({
		name: 'a locked extension refuses to sign without a popup',
		ok: lockedSign.code === 4100,
		detail: lockedSign.code
	});

	const unlockedState = await panelCall([{ type: 'set-account', account }]);
	const unlockedAccounts = await ethCall({ method: 'eth_accounts' });
	check({
		name: 'signing in again unlocks the extension and keeps the sites',
		ok:
			unlockedState?.locked === false &&
			unlockedState?.sites?.[dappOrigin]?.eth === true &&
			unlockedAccounts.result?.[0] === account.eth
	});

	const clearedState = await panelCall([{ type: 'revoke-all-sites' }]);
	const clearedAccounts = await ethCall({ method: 'eth_accounts' });
	check({
		name: 'disconnecting all sites removes every site',
		ok:
			Object.keys(clearedState?.sites ?? { pending: true }).length === 0 &&
			Array.isArray(clearedAccounts.result) &&
			clearedAccounts.result.length === 0 &&
			(await solAccountCount()) === 0
	});

	const offlinePanel = await context.newPage();
	await offlinePanel.setViewportSize({ width: 360, height: 720 });
	await offlinePanel.route(`${OISY_ORIGIN}/extension/panel/**`, (route) => route.abort());
	await offlinePanel.clock.install();
	await offlinePanel.goto(`chrome-extension://${EXTENSION_ID}/sidepanel.html`);
	await offlinePanel.clock.runFor(16_000);
	const unreachableShown = await offlinePanel
		.waitForSelector('#unreachable:not([hidden])', { timeout: 5000 })
		.then(() => true)
		.catch(() => false);
	check({ name: "the side panel says when OISY didn't load", ok: unreachableShown });
	await offlinePanel.screenshot({ path: join(SCREENSHOT_DIR, 'side-panel-unreachable.png') });
} finally {
	await context.close();
	await rm(userDataDir, { recursive: true, force: true });
}

const failed = results.filter(({ ok }) => !ok);
process.stdout.write(`\n${results.length - failed.length}/${results.length} checks passed\n`);
process.exit(failed.length === 0 ? 0 : 1);
