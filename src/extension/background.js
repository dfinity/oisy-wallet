/* global chrome */
import {
	ETH_CHAIN_ID,
	ETH_CHAIN_ID_HEX,
	ETH_RPC_URL,
	OISY_ORIGIN,
	OISY_REQUEST_URL,
	POPUP_HEIGHT,
	POPUP_WIDTH
} from './config.js';

const STORAGE_KEY = 'state';

// Clicking the toolbar icon opens the side panel with balances and connected sites. It stays open
// next to the dapp, unlike a toolbar popup that closes as soon as another window takes focus.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined);

// Long enough for OISY's own success step to show before the popup closes, and for the user to
// read why a request failed. A rejection closes right away.
const CLOSE_AFTER_SUCCESS_MS = 900;
const CLOSE_AFTER_REJECTION_MS = 300;
const CLOSE_AFTER_FAILURE_MS = 4000;

const ERRORS = Object.freeze({
	userRejected: { code: 4001, message: 'The user rejected the request.' },
	unauthorized: { code: 4100, message: 'This site is not connected to OISY. Connect first.' },
	unsupportedMethod: { code: 4200, message: 'OISY does not support this method.' },
	unsupportedChain: {
		code: 4902,
		message: 'OISY only supports Sepolia in this proof of concept.'
	},
	requestPending: { code: -32002, message: 'An OISY request is already open. Finish it first.' },
	internal: { code: -32603, message: 'OISY could not process the request.' }
});

const ETH_SIGN_METHODS = new Set(['personal_sign', 'eth_signTypedData_v4', 'eth_sendTransaction']);

// Read-only calls are answered from a public Sepolia node without involving OISY.
const ETH_READ_METHODS = new Set([
	'eth_blockNumber',
	'eth_call',
	'eth_estimateGas',
	'eth_feeHistory',
	'eth_gasPrice',
	'eth_getBalance',
	'eth_getBlockByHash',
	'eth_getBlockByNumber',
	'eth_getCode',
	'eth_getLogs',
	'eth_getStorageAt',
	'eth_getTransactionByHash',
	'eth_getTransactionCount',
	'eth_getTransactionReceipt',
	'eth_maxPriorityFeePerGas'
]);

const SOL_SIGN_METHODS = new Set([
	'sol_signMessage',
	'sol_signTransaction',
	'sol_signAndSendTransaction'
]);

class RpcError extends Error {
	constructor({ code, message, data }) {
		super(message);
		this.code = code;
		this.data = data;
	}
}

const toRpcError = (err) =>
	err instanceof RpcError
		? { code: err.code, message: err.message, ...(err.data !== undefined && { data: err.data }) }
		: { ...ERRORS.internal, message: err?.message ?? ERRORS.internal.message };

const post = ({ port, message }) => {
	try {
		port.postMessage(message);
	} catch (_) {
		// The page went away; nothing to deliver to.
	}
};

// --- Stored state: the OISY account and which sites may see which address --------------------

const loadState = async () => {
	const { [STORAGE_KEY]: state } = await chrome.storage.local.get(STORAGE_KEY);
	return { account: state?.account ?? null, sites: state?.sites ?? {} };
};

const saveState = (state) => chrome.storage.local.set({ [STORAGE_KEY]: state });

const dappPorts = new Set();

const notify = ({ origin, chain, name, data }) => {
	for (const entry of dappPorts) {
		if (origin === undefined || entry.origin === origin) {
			post({ port: entry.port, message: { type: 'event', chain, name, data } });
		}
	}
};

const notifyAccountGone = (origin) => {
	notify({ origin, chain: 'eth', name: 'accountsChanged', data: [] });
	notify({ origin, chain: 'sol', name: 'accountChanged', data: null });
};

// A different OISY identity means different addresses, so earlier site approvals no longer apply.
const storeAccount = async (account) => {
	const state = await loadState();
	const unchanged = state.account?.eth === account.eth && state.account?.sol === account.sol;
	if (unchanged) {
		return;
	}
	await saveState({ account, sites: {} });
	if (state.account !== null) {
		notifyAccountGone();
	}
};

const grantSite = async ({ origin, chain }) => {
	const state = await loadState();
	const site = state.sites[origin] ?? { eth: false, sol: false };
	await saveState({ ...state, sites: { ...state.sites, [origin]: { ...site, [chain]: true } } });
};

const revokeSite = async ({ origin, chain }) => {
	const state = await loadState();
	const sites = { ...state.sites };
	if (chain === undefined) {
		delete sites[origin];
	} else if (sites[origin] !== undefined) {
		sites[origin] = { ...sites[origin], [chain]: false };
	}
	await saveState({ ...state, sites });
	if (chain === undefined || chain === 'eth') {
		notify({ origin, chain: 'eth', name: 'accountsChanged', data: [] });
	}
	if (chain === undefined || chain === 'sol') {
		notify({ origin, chain: 'sol', name: 'accountChanged', data: null });
	}
};

// --- The OISY popup window: one request at a time ------------------------------------------------

let activeRequest = null;

const popupPosition = async () => {
	try {
		const current = await chrome.windows.getLastFocused();
		return {
			left: Math.max(current.left + current.width - POPUP_WIDTH - 16, 0),
			top: current.top + 72
		};
	} catch (_) {
		return {};
	}
};

// Placing the popup by the top-right corner of the browser window, like other wallets. Chrome
// refuses bounds that fall mostly off the screen (a window wider than the screen, another monitor),
// and then it places the popup itself.
const createPopup = async (url) => {
	const options = { url, type: 'popup', width: POPUP_WIDTH, height: POPUP_HEIGHT, focused: true };
	try {
		return await chrome.windows.create({ ...options, ...(await popupPosition()) });
	} catch (_) {
		return await chrome.windows.create(options);
	}
};

const settle = ({ entry, result, error }) => {
	if (entry.settled) {
		return;
	}
	entry.settled = true;
	if (activeRequest === entry) {
		activeRequest = null;
	}
	if (error === undefined) {
		entry.resolve(result);
	} else {
		entry.reject(new RpcError(error));
	}
	if (entry.windowId !== undefined) {
		const delay =
			error === undefined
				? CLOSE_AFTER_SUCCESS_MS
				: error.code === ERRORS.userRejected.code
					? CLOSE_AFTER_REJECTION_MS
					: CLOSE_AFTER_FAILURE_MS;
		setTimeout(() => chrome.windows.remove(entry.windowId).catch(() => undefined), delay);
	}
};

const openOisy = async (request) => {
	if (activeRequest !== null) {
		if (activeRequest.windowId !== undefined) {
			chrome.windows.update(activeRequest.windowId, { focused: true }).catch(() => undefined);
		}
		throw new RpcError(ERRORS.requestPending);
	}

	const entry = { ...request, id: crypto.randomUUID(), settled: false };
	activeRequest = entry;
	const result = new Promise((resolve, reject) => {
		entry.resolve = resolve;
		entry.reject = reject;
	});

	try {
		const popup = await createPopup(`${OISY_REQUEST_URL}?request=${entry.id}`);
		entry.windowId = popup.id;
	} catch (_) {
		settle({ entry, error: ERRORS.internal });
	}

	return result;
};

chrome.windows.onRemoved.addListener((windowId) => {
	if (activeRequest !== null && activeRequest.windowId === windowId) {
		settle({ entry: activeRequest, error: ERRORS.userRejected });
	}
});

const publicRequest = ({ id, kind, chain, method, params, origin, address }) => ({
	id,
	kind,
	chain,
	method,
	params,
	origin,
	address
});

const onOisyResult = async ({ entry, result }) => {
	if (entry.kind === 'sign') {
		settle({ entry, result });
		return;
	}

	const { eth, sol } = result ?? {};
	if (typeof eth !== 'string' || typeof sol !== 'string') {
		settle({ entry, error: ERRORS.internal });
		return;
	}
	await storeAccount({ eth, sol });
	if (entry.kind === 'connect') {
		await grantSite({ origin: entry.origin, chain: entry.chain });
	}
	settle({ entry, result: { eth, sol } });
};

const normalizeOisyError = (error) => ({
	code: typeof error?.code === 'number' ? error.code : ERRORS.userRejected.code,
	message: typeof error?.message === 'string' ? error.message : ERRORS.userRejected.message
});

// Only oisy.com may connect, and only the popup window opened for a request may answer it.
chrome.runtime.onConnectExternal.addListener((port) => {
	if (port.sender?.origin !== OISY_ORIGIN) {
		port.disconnect();
		return;
	}

	port.onMessage.addListener(async (message) => {
		const entry = activeRequest;
		const fromPopup =
			entry !== null && port.sender?.tab?.windowId === entry.windowId && message?.id === entry.id;

		// `ping` needs no answer: receiving it is what keeps the worker awake while the popup is open.
		if (message?.type === 'get-request') {
			post({
				port,
				message: { type: 'request', request: fromPopup ? publicRequest(entry) : null }
			});
		} else if (message?.type === 'response' && fromPopup) {
			await onOisyResult({ entry, result: message.result });
		} else if (message?.type === 'error' && fromPopup) {
			settle({ entry, error: normalizeOisyError(message.error) });
		}
	});
});

// --- Requests from dapps -----------------------------------------------------------------------

const ethRpc = async ({ method, params }) => {
	const response = await fetch(ETH_RPC_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: params ?? [] })
	});
	if (!response.ok) {
		throw new RpcError({
			...ERRORS.internal,
			message: `The Sepolia node answered ${response.status}.`
		});
	}
	const body = await response.json();
	if (body.error !== undefined) {
		throw new RpcError(body.error);
	}
	return body.result;
};

const connectEth = async ({ origin, port }) => {
	const { eth } = await openOisy({ kind: 'connect', chain: 'eth', origin, port });
	return eth;
};

const handleEth = async ({ port, origin, method, params }) => {
	const { account, sites } = await loadState();
	const connected = account !== null && sites[origin]?.eth === true;

	switch (method) {
		case 'eth_chainId':
			return ETH_CHAIN_ID_HEX;
		case 'net_version':
			return String(ETH_CHAIN_ID);
		case 'eth_accounts':
			return connected ? [account.eth] : [];
		case 'eth_requestAccounts':
			return [connected ? account.eth : await connectEth({ origin, port })];
		case 'wallet_requestPermissions':
			if (!connected) {
				await connectEth({ origin, port });
			}
			return [{ parentCapability: 'eth_accounts' }];
		case 'wallet_getPermissions':
			return connected ? [{ parentCapability: 'eth_accounts' }] : [];
		case 'wallet_revokePermissions':
			await revokeSite({ origin, chain: 'eth' });
			return null;
		case 'wallet_switchEthereumChain':
			if (`${params?.[0]?.chainId ?? ''}`.toLowerCase() === ETH_CHAIN_ID_HEX) {
				return null;
			}
			throw new RpcError(ERRORS.unsupportedChain);
		default:
			break;
	}

	if (ETH_SIGN_METHODS.has(method)) {
		if (!connected) {
			throw new RpcError(ERRORS.unauthorized);
		}
		return await openOisy({
			kind: 'sign',
			chain: 'eth',
			method,
			params,
			origin,
			port,
			address: account.eth
		});
	}

	if (ETH_READ_METHODS.has(method)) {
		return await ethRpc({ method, params });
	}

	throw new RpcError(ERRORS.unsupportedMethod);
};

const handleSol = async ({ port, origin, method, params }) => {
	const { account, sites } = await loadState();
	const connected = account !== null && sites[origin]?.sol === true;

	switch (method) {
		case 'sol_accounts':
			return connected ? { address: account.sol } : null;
		case 'sol_connect': {
			if (connected) {
				return { address: account.sol };
			}
			const { sol } = await openOisy({ kind: 'connect', chain: 'sol', origin, port });
			return { address: sol };
		}
		case 'sol_disconnect':
			await revokeSite({ origin, chain: 'sol' });
			return null;
		default:
			break;
	}

	if (SOL_SIGN_METHODS.has(method)) {
		if (!connected) {
			throw new RpcError(ERRORS.unauthorized);
		}
		return await openOisy({
			kind: 'sign',
			chain: 'sol',
			method,
			params,
			origin,
			port,
			address: account.sol
		});
	}

	throw new RpcError(ERRORS.unsupportedMethod);
};

const handleDappRequest = (request) => {
	if (request.chain === 'eth') {
		return handleEth(request);
	}
	if (request.chain === 'sol') {
		return handleSol(request);
	}
	throw new RpcError(ERRORS.unsupportedMethod);
};

// The origin comes from the browser, never from the page's message, and only top-level pages count.
chrome.runtime.onConnect.addListener((port) => {
	if (port.name !== 'oisy-dapp') {
		return;
	}
	const origin = port.sender?.origin;
	if (typeof origin !== 'string' || origin === 'null' || port.sender?.frameId !== 0) {
		port.disconnect();
		return;
	}

	const entry = { port, origin };
	dappPorts.add(entry);

	port.onMessage.addListener(async ({ id, chain, method, params }) => {
		try {
			const result = await handleDappRequest({ port, origin, chain, method, params });
			post({ port, message: { id, result: result ?? null } });
		} catch (err) {
			post({ port, message: { id, error: toRpcError(err) } });
		}
	});

	// A reload or navigation drops the port, and the answer must not reach whatever page is next.
	port.onDisconnect.addListener(() => {
		dappPorts.delete(entry);
		if (activeRequest !== null && activeRequest.port === port) {
			settle({ entry: activeRequest, error: ERRORS.userRejected });
		}
	});
});

// --- Messages from the extension's own side panel ----------------------------------------------

const handlePopupMessage = async (message) => {
	switch (message?.type) {
		case 'pair':
			if (activeRequest !== null) {
				throw new RpcError(ERRORS.requestPending);
			}
			// Not awaited: the side panel re-renders from storage once the OISY window answers.
			openOisy({ kind: 'pair' }).catch(() => undefined);
			return null;
		case 'revoke-site':
			await revokeSite({ origin: message.origin });
			return null;
		case 'forget-account':
			await saveState({ account: null, sites: {} });
			notifyAccountGone();
			return null;
		default:
			throw new RpcError(ERRORS.unsupportedMethod);
	}
};

// eslint-disable-next-line local-rules/prefer-object-params -- Chrome API callback signature
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	const fromSidePanel =
		sender.id === chrome.runtime.id && sender.url?.startsWith(chrome.runtime.getURL('')) === true;
	if (!fromSidePanel) {
		return false;
	}
	handlePopupMessage(message).then(
		(result) => sendResponse({ result }),
		(err) => sendResponse({ error: toRpcError(err) })
	);
	return true;
});
