/* global chrome */
import { ETH_RPC_URL, SOL_RPC_URL } from './config.js';

const STORAGE_KEY = 'state';

const element = (id) => document.getElementById(id);

const shorten = (address) =>
	address.length > 16 ? `${address.slice(0, 6)}…${address.slice(-6)}` : address;

const formatUnits = ({ value, decimals, symbol }) => {
	const base = 10n ** BigInt(decimals);
	const whole = value / base;
	const fraction = ((value % base) * 10000n) / base;
	return `${whole}.${fraction.toString().padStart(4, '0')} ${symbol}`;
};

const rpc = async ({ url, method, params }) => {
	const response = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
	});
	if (!response.ok) {
		throw new Error(`RPC answered ${response.status}`);
	}
	const body = await response.json();
	if (body.error !== undefined) {
		throw new Error(body.error.message);
	}
	return body.result;
};

const loadEthBalance = async (address) =>
	formatUnits({
		value: BigInt(
			await rpc({ url: ETH_RPC_URL, method: 'eth_getBalance', params: [address, 'latest'] })
		),
		decimals: 18,
		symbol: 'ETH'
	});

const loadSolBalance = async (address) => {
	const { value } = await rpc({ url: SOL_RPC_URL, method: 'getBalance', params: [address] });
	return formatUnits({ value: BigInt(value), decimals: 9, symbol: 'SOL' });
};

const send = async (message) => {
	const response = await chrome.runtime.sendMessage(message);
	if (response?.error !== undefined) {
		throw new Error(response.error.message);
	}
	return response?.result;
};

const renderBalances = async (account) => {
	const ethBalance = element('eth-balance');
	const solBalance = element('sol-balance');
	ethBalance.textContent = '…';
	solBalance.textContent = '…';
	element('balance-error').hidden = true;

	const [eth, sol] = await Promise.allSettled([
		loadEthBalance(account.eth),
		loadSolBalance(account.sol)
	]);
	ethBalance.textContent = eth.status === 'fulfilled' ? eth.value : '—';
	solBalance.textContent = sol.status === 'fulfilled' ? sol.value : '—';
	element('balance-error').hidden = eth.status === 'fulfilled' && sol.status === 'fulfilled';
};

const renderSites = (sites) => {
	const list = element('sites');
	list.replaceChildren();
	const connected = Object.entries(sites).filter(
		([, chains]) => chains.eth === true || chains.sol === true
	);

	for (const [origin, chains] of connected) {
		const item = document.createElement('li');

		const name = document.createElement('span');
		name.textContent = origin.replace(/^https?:\/\//, '');
		name.title = origin;

		const chips = document.createElement('span');
		chips.className = 'chips';
		chips.textContent = [chains.eth ? 'ETH' : null, chains.sol ? 'SOL' : null]
			.filter((chip) => chip !== null)
			.join(' · ');

		const disconnect = document.createElement('button');
		disconnect.type = 'button';
		disconnect.textContent = 'Disconnect';
		disconnect.addEventListener('click', () => send({ type: 'revoke-site', origin }));

		item.append(name, chips, disconnect);
		list.append(item);
	}

	element('no-sites').hidden = connected.length > 0;
};

const render = async () => {
	const { [STORAGE_KEY]: state } = await chrome.storage.local.get(STORAGE_KEY);
	const account = state?.account ?? null;

	element('empty').hidden = account !== null;
	element('account').hidden = account === null;

	if (account === null) {
		return;
	}

	const ethAddress = element('eth-address');
	ethAddress.textContent = shorten(account.eth);
	ethAddress.title = account.eth;

	const solAddress = element('sol-address');
	solAddress.textContent = shorten(account.sol);
	solAddress.title = account.sol;

	renderSites(state?.sites ?? {});
	await renderBalances(account);
};

element('pair').addEventListener('click', async () => {
	const error = element('pair-error');
	error.hidden = true;
	try {
		await send({ type: 'pair' });
	} catch (err) {
		error.textContent = err.message;
		error.hidden = false;
	}
});

element('retry').addEventListener('click', render);

element('forget').addEventListener('click', () => send({ type: 'forget-account' }));

chrome.storage.onChanged.addListener((changes) => {
	if (changes[STORAGE_KEY] !== undefined) {
		render();
	}
});

render();
