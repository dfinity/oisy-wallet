import { ethers } from '/vendor/ethers.js';

const SOL_RPC_URL = 'https://api.devnet.solana.com';
const SOL_CHAIN = 'solana:devnet';
const MESSAGE = 'Hello from the OISY extension test dapp';
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const element = (id) => document.getElementById(id);

// --- Results ------------------------------------------------------------------------------------

// Kept on `window` so the Playwright smoke test can read what happened.
window.oisyTestLog = [];

const log = ({ label, text, ok }) => {
	const item = document.createElement('li');
	item.className = ok === undefined ? '' : ok ? 'ok' : 'bad';
	item.textContent = `${new Date().toLocaleTimeString()}  ${label}: ${text}`;
	element('log').prepend(item);
	window.oisyTestLog.push({ label, text, ok });
};

const describeError = (err) => `${err?.code ?? ''} ${err?.message ?? String(err)}`.trim();

const run =
	({ label, action }) =>
	async () => {
		try {
			log({ label, ...(await action()) });
		} catch (err) {
			log({ label, text: describeError(err), ok: false });
		}
	};

const onClick = ({ id, label, action }) =>
	element(id).addEventListener('click', run({ label, action }));

// --- Wallet discovery, the way wagmi and the Solana wallet adapter do it ------------------------

const ethProviders = new Map();
const solWallets = [];
let eth = null;
let sol = null;

const renderWallets = () => {
	const entries = [
		...[...ethProviders.values()].map(({ info }) => `${info.name} · EIP-6963 · ${info.rdns}`),
		...solWallets.map(({ name, chains }) => `${name} · Wallet Standard · ${chains.join(', ')}`)
	];

	const list = element('wallets');
	list.replaceChildren(
		...(entries.length === 0 ? ['None yet'] : entries).map((entry) => {
			const item = document.createElement('li');
			item.textContent = entry;
			item.className = entries.length === 0 ? 'muted' : '';
			return item;
		})
	);

	eth = [...ethProviders.values()].find(({ info }) => info.rdns === 'com.oisy')?.provider ?? null;
	sol = solWallets.find(({ name }) => name === 'OISY') ?? null;
	window.oisyTest = { eth, sol, wallets: entries };
};

window.addEventListener('eip6963:announceProvider', ({ detail }) => {
	ethProviders.set(detail.info.uuid, detail);
	renderWallets();
});
window.dispatchEvent(new Event('eip6963:requestProvider'));

const walletsApi = Object.freeze({
	register: (...wallets) => {
		solWallets.push(...wallets);
		renderWallets();
		return () => undefined;
	}
});
window.addEventListener('wallet-standard:register-wallet', ({ detail }) => detail(walletsApi));
window.dispatchEvent(new CustomEvent('wallet-standard:app-ready', { detail: walletsApi }));

renderWallets();

// --- Ethereum -----------------------------------------------------------------------------------

let ethAccount = null;

const ethRequest = ({ method, params }) => {
	if (eth === null) {
		throw new Error('OISY was not found through EIP-6963.');
	}
	return eth.request({ method, params });
};

const currentEthAccount = async () => {
	const account = ethAccount ?? (await ethRequest({ method: 'eth_accounts' }))[0];
	if (account === undefined) {
		throw new Error('Connect first.');
	}
	return account;
};

const TYPED_DATA = {
	domain: { name: 'OISY extension test', version: '1', chainId: 11155111 },
	types: {
		Mail: [
			{ name: 'from', type: 'string' },
			{ name: 'contents', type: 'string' }
		]
	},
	message: { from: 'OISY test dapp', contents: MESSAGE }
};

onClick({
	id: 'eth-accounts',
	label: 'eth_accounts',
	action: async () => ({ text: JSON.stringify(await ethRequest({ method: 'eth_accounts' })) })
});

onClick({
	id: 'eth-connect',
	label: 'Ethereum connect',
	action: async () => {
		const [account] = await ethRequest({ method: 'eth_requestAccounts' });
		ethAccount = account;
		element('eth-account').textContent = account;
		const chainId = await ethRequest({ method: 'eth_chainId' });
		return { text: `${account} on chain ${Number(chainId)}`, ok: true };
	}
});

onClick({
	id: 'eth-sign',
	label: 'personal_sign',
	action: async () => {
		const account = await currentEthAccount();
		const signature = await ethRequest({
			method: 'personal_sign',
			params: [ethers.hexlify(ethers.toUtf8Bytes(MESSAGE)), account]
		});
		const recovered = ethers.verifyMessage(MESSAGE, signature);
		const ok = recovered.toLowerCase() === account.toLowerCase();
		return { text: `${ok ? 'valid' : 'INVALID'} signature, recovered ${recovered}`, ok };
	}
});

onClick({
	id: 'eth-typed',
	label: 'eth_signTypedData_v4',
	action: async () => {
		const account = await currentEthAccount();
		const payload = {
			...TYPED_DATA,
			primaryType: 'Mail',
			types: {
				EIP712Domain: [
					{ name: 'name', type: 'string' },
					{ name: 'version', type: 'string' },
					{ name: 'chainId', type: 'uint256' }
				],
				...TYPED_DATA.types
			}
		};
		const signature = await ethRequest({
			method: 'eth_signTypedData_v4',
			params: [account, JSON.stringify(payload)]
		});
		const recovered = ethers.verifyTypedData(
			TYPED_DATA.domain,
			TYPED_DATA.types,
			TYPED_DATA.message,
			signature
		);
		const ok = recovered.toLowerCase() === account.toLowerCase();
		return { text: `${ok ? 'valid' : 'INVALID'} signature, recovered ${recovered}`, ok };
	}
});

onClick({
	id: 'eth-send',
	label: 'eth_sendTransaction',
	action: async () => {
		const account = await currentEthAccount();
		const hash = await ethRequest({
			method: 'eth_sendTransaction',
			params: [{ from: account, to: account, value: '0x0' }]
		});
		return { text: `https://sepolia.etherscan.io/tx/${hash}`, ok: true };
	}
});

onClick({
	id: 'eth-switch',
	label: 'wallet_switchEthereumChain to mainnet',
	action: async () => {
		try {
			await ethRequest({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x1' }] });
			return { text: 'accepted, but OISY should have refused', ok: false };
		} catch (err) {
			return { text: `refused as expected (${describeError(err)})`, ok: err.code === 4902 };
		}
	}
});

// --- Solana -------------------------------------------------------------------------------------

let solAccount = null;

const base58Encode = (bytes) => {
	let zeros = 0;
	while (zeros < bytes.length && bytes[zeros] === 0) {
		zeros++;
	}
	const digits = [];
	for (let i = zeros; i < bytes.length; i++) {
		let carry = bytes[i];
		for (let j = 0; j < digits.length; j++) {
			carry += digits[j] << 8;
			digits[j] = carry % 58;
			carry = Math.floor(carry / 58);
		}
		while (carry > 0) {
			digits.push(carry % 58);
			carry = Math.floor(carry / 58);
		}
	}
	return (
		'1'.repeat(zeros) +
		digits
			.reverse()
			.map((digit) => BASE58_ALPHABET[digit])
			.join('')
	);
};

const base58Decode = (text) => {
	let zeros = 0;
	while (zeros < text.length && text[zeros] === '1') {
		zeros++;
	}
	const bytes = [];
	for (let i = zeros; i < text.length; i++) {
		let carry = BASE58_ALPHABET.indexOf(text[i]);
		for (let j = 0; j < bytes.length; j++) {
			carry += bytes[j] * 58;
			bytes[j] = carry & 0xff;
			carry >>= 8;
		}
		while (carry > 0) {
			bytes.push(carry & 0xff);
			carry >>= 8;
		}
	}
	return new Uint8Array([...new Array(zeros).fill(0), ...bytes.reverse()]);
};

const solFeature = (name) => {
	const feature = sol?.features[name];
	if (feature === undefined) {
		throw new Error(`OISY was not found through the Wallet Standard, or lacks ${name}.`);
	}
	return feature;
};

const currentSolAccount = () => {
	if (solAccount === null) {
		throw new Error('Connect first.');
	}
	return solAccount;
};

const verifyEd25519 = async ({ publicKey, signature, data }) => {
	const key = await crypto.subtle.importKey('raw', publicKey, { name: 'Ed25519' }, false, [
		'verify'
	]);
	return crypto.subtle.verify({ name: 'Ed25519' }, key, signature, data);
};

const solRpc = async ({ method, params }) => {
	const response = await fetch(SOL_RPC_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
	});
	const body = await response.json();
	if (body.error !== undefined) {
		throw new Error(body.error.message);
	}
	return body.result;
};

const compactU16 = (value) => {
	const bytes = [];
	let rest = value;
	for (;;) {
		const byte = rest & 0x7f;
		rest >>= 7;
		if (rest === 0) {
			bytes.push(byte);
			return bytes;
		}
		bytes.push(byte | 0x80);
	}
};

const littleEndian = ({ value, size }) => {
	const bytes = new Uint8Array(size);
	const view = new DataView(bytes.buffer);
	if (size === 4) {
		view.setUint32(0, value, true);
	} else {
		view.setBigUint64(0, value, true);
	}
	return [...bytes];
};

// A legacy transaction moving 1,000 lamports from the account to itself: a System Program
// transfer that OISY's review can read in full.
const buildSelfTransfer = async (account) => {
	const {
		value: { blockhash }
	} = await solRpc({ method: 'getLatestBlockhash', params: [{ commitment: 'confirmed' }] });
	const systemProgram = new Uint8Array(32);
	const transferInstruction = 2;
	const message = new Uint8Array([
		...[1, 0, 1],
		...compactU16(2),
		...account.publicKey,
		...systemProgram,
		...base58Decode(blockhash),
		...compactU16(1),
		1,
		...compactU16(2),
		0,
		0,
		...compactU16(12),
		...littleEndian({ value: transferInstruction, size: 4 }),
		...littleEndian({ value: 1000n, size: 8 })
	]);
	return new Uint8Array([...compactU16(1), ...new Uint8Array(64), ...message]);
};

onClick({
	id: 'sol-connect',
	label: 'Solana connect',
	action: async () => {
		const { accounts } = await solFeature('standard:connect').connect();
		[solAccount] = accounts;
		element('sol-account').textContent = solAccount?.address ?? 'Not connected';
		return { text: solAccount?.address ?? 'no account', ok: solAccount !== undefined };
	}
});

onClick({
	id: 'sol-sign',
	label: 'Solana signMessage',
	action: async () => {
		const account = currentSolAccount();
		const message = new TextEncoder().encode(MESSAGE);
		const [{ signature }] = await solFeature('solana:signMessage').signMessage({
			account,
			message
		});
		const ok = await verifyEd25519({ publicKey: account.publicKey, signature, data: message });
		return { text: `${ok ? 'valid' : 'INVALID'} signature ${base58Encode(signature)}`, ok };
	}
});

onClick({
	id: 'sol-sign-tx',
	label: 'Solana signTransaction',
	action: async () => {
		const account = currentSolAccount();
		const transaction = await buildSelfTransfer(account);
		const [{ signedTransaction }] = await solFeature('solana:signTransaction').signTransaction({
			account,
			transaction,
			chain: SOL_CHAIN
		});
		const signature = signedTransaction.slice(1, 65);
		const message = signedTransaction.slice(65);
		const ok =
			message.every((byte, index) => byte === transaction[65 + index]) &&
			(await verifyEd25519({ publicKey: account.publicKey, signature, data: message }));
		return {
			text: `${ok ? 'valid' : 'INVALID'} signed transaction ${base58Encode(signature)}`,
			ok
		};
	}
});

onClick({
	id: 'sol-send-tx',
	label: 'Solana signAndSendTransaction',
	action: async () => {
		const account = currentSolAccount();
		const transaction = await buildSelfTransfer(account);
		const [{ signature }] = await solFeature(
			'solana:signAndSendTransaction'
		).signAndSendTransaction({ account, transaction, chain: SOL_CHAIN });
		return {
			text: `https://explorer.solana.com/tx/${base58Encode(signature)}?cluster=devnet`,
			ok: true
		};
	}
});
