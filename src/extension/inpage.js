// Runs in the page's own JavaScript world, so the dapp can see it. It holds nothing secret: every
// request goes to the extension's background worker, which decides what the site may do, and every
// signature is made in the OISY popup after the user reviews it.
(() => {
	const TARGET_CONTENT = 'oisy-extension:content';
	const TARGET_INPAGE = 'oisy-extension:inpage';

	if (window.oisyExtensionInjected === true) {
		return;
	}
	Object.defineProperty(window, 'oisyExtensionInjected', { value: true });

	const ICON =
		'data:image/png;base64,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';
	const SOL_CHAINS = ['solana:devnet'];

	const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

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
			const value = BASE58_ALPHABET.indexOf(text[i]);
			if (value < 0) {
				throw new Error('Invalid base58 string.');
			}
			let carry = value;
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

	const bytesToBase64 = (bytes) => {
		let binary = '';
		for (const byte of bytes) {
			binary += String.fromCharCode(byte);
		}
		return btoa(binary);
	};

	const providerError = ({ code, message, data }) => {
		const error = new Error(message);
		error.code = code;
		if (data !== undefined) {
			error.data = data;
		}
		return error;
	};

	// --- Transport to the content script -----------------------------------------------------------

	let nextRequestId = 0;
	const pendingRequests = new Map();
	const eventHandlers = { eth: () => undefined, sol: () => undefined };

	const send = ({ chain, method, params }) =>
		new Promise((resolve, reject) => {
			nextRequestId++;
			const id = `${Date.now()}-${nextRequestId}`;
			pendingRequests.set(id, { resolve, reject });
			window.postMessage(
				{ target: TARGET_CONTENT, id, chain, method, params },
				window.location.origin
			);
		});

	window.addEventListener('message', (event) => {
		if (event.source !== window || event.origin !== window.location.origin) {
			return;
		}
		const { data } = event;
		if (data?.target !== TARGET_INPAGE) {
			return;
		}
		if (data.type === 'event') {
			eventHandlers[data.chain]?.(data);
			return;
		}
		const pending = pendingRequests.get(data.id);
		if (pending === undefined) {
			return;
		}
		pendingRequests.delete(data.id);
		if (data.error !== undefined) {
			pending.reject(providerError(data.error));
			return;
		}
		pending.resolve(data.result);
	});

	// --- Ethereum: EIP-1193 provider, announced through EIP-6963 -----------------------------------

	const ethListeners = new Map();
	let ethAccounts = [];

	const emitEth = ({ name, payload }) => {
		for (const listener of ethListeners.get(name) ?? []) {
			try {
				listener(payload);
			} catch (_) {
				// A failing dapp listener must not stop the others.
			}
		}
	};

	const updateEthAccounts = (accounts) => {
		const changed =
			accounts.length !== ethAccounts.length ||
			accounts.some((account, index) => account !== ethAccounts[index]);
		ethAccounts = accounts;
		if (changed) {
			emitEth({ name: 'accountsChanged', payload: accounts });
		}
	};

	eventHandlers.eth = ({ name, data }) => {
		if (name === 'accountsChanged') {
			updateEthAccounts(data);
		}
	};

	const ethereum = {
		isOisy: true,
		request: async ({ method, params } = {}) => {
			if (typeof method !== 'string') {
				throw providerError({ code: -32600, message: 'Invalid request: missing method.' });
			}
			const result = await send({ chain: 'eth', method, params: params ?? [] });
			if (method === 'eth_requestAccounts' || method === 'eth_accounts') {
				updateEthAccounts(result);
			}
			return result;
		},
		// eslint-disable-next-line local-rules/prefer-object-params -- EIP-1193 signature
		on: (name, listener) => {
			const listeners = ethListeners.get(name) ?? new Set();
			listeners.add(listener);
			ethListeners.set(name, listeners);
			return ethereum;
		},
		// eslint-disable-next-line local-rules/prefer-object-params -- EIP-1193 signature
		removeListener: (name, listener) => {
			ethListeners.get(name)?.delete(listener);
			return ethereum;
		}
	};
	ethereum.off = ethereum.removeListener;

	const providerInfo = Object.freeze({
		uuid: crypto.randomUUID(),
		name: 'OISY',
		icon: ICON,
		rdns: 'com.oisy'
	});

	const announceEthereumProvider = () =>
		window.dispatchEvent(
			new CustomEvent('eip6963:announceProvider', {
				detail: Object.freeze({ info: providerInfo, provider: ethereum })
			})
		);

	window.addEventListener('eip6963:requestProvider', announceEthereumProvider);
	announceEthereumProvider();

	// --- Solana: Wallet Standard ------------------------------------------------------------------

	const SOL_ACCOUNT_FEATURES = [
		'solana:signMessage',
		'solana:signTransaction',
		'solana:signAndSendTransaction'
	];

	const solChangeListeners = new Set();
	let solAccount = null;

	const setSolAccount = (address) => {
		const current = solAccount?.address ?? null;
		const next = address ?? null;
		if (current === next) {
			return;
		}
		solAccount =
			next === null
				? null
				: Object.freeze({
						address: next,
						publicKey: base58Decode(next),
						chains: SOL_CHAINS,
						features: SOL_ACCOUNT_FEATURES,
						label: 'OISY',
						icon: ICON
					});
		for (const listener of solChangeListeners) {
			listener({ accounts: solAccount === null ? [] : [solAccount] });
		}
	};

	eventHandlers.sol = ({ name, data }) => {
		if (name === 'accountChanged') {
			setSolAccount(data);
		}
	};

	const assertSolChain = (chain) => {
		if (chain !== undefined && !SOL_CHAINS.includes(chain)) {
			throw providerError({
				code: 4901,
				message: `OISY only supports ${SOL_CHAINS.join(', ')} in this proof of concept.`
			});
		}
	};

	const readCompactU16 = ({ bytes, offset }) => {
		let value = 0;
		let size = 0;
		for (;;) {
			const byte = bytes[offset + size];
			value |= (byte & 0x7f) << (7 * size);
			size++;
			if ((byte & 0x80) === 0) {
				return { value, size };
			}
		}
	};

	// OISY returns only the signature for `signTransaction`; the Wallet Standard expects the signed
	// transaction, so the signature goes into the slot of the matching required signer.
	const insertSolSignature = ({ transaction, signature, publicKey }) => {
		const { value: signatureCount, size: signatureCountSize } = readCompactU16({
			bytes: transaction,
			offset: 0
		});
		let cursor = signatureCountSize + signatureCount * 64;
		const isVersioned = (transaction[cursor] & 0x80) !== 0;
		if (isVersioned) {
			cursor++;
		}
		const requiredSignatures = transaction[cursor];
		cursor += 3;
		const { value: keyCount, size: keyCountSize } = readCompactU16({
			bytes: transaction,
			offset: cursor
		});
		cursor += keyCountSize;
		for (let index = 0; index < Math.min(requiredSignatures, keyCount); index++) {
			const key = transaction.subarray(cursor + index * 32, cursor + (index + 1) * 32);
			if (key.every((byte, i) => byte === publicKey[i])) {
				const signed = new Uint8Array(transaction);
				signed.set(signature, signatureCountSize + index * 64);
				return signed;
			}
		}
		throw providerError({ code: -32602, message: 'OISY is not a signer of this transaction.' });
	};

	const solWallet = {
		version: '1.0.0',
		name: 'OISY',
		icon: ICON,
		chains: SOL_CHAINS,
		get accounts() {
			return solAccount === null ? [] : [solAccount];
		},
		features: {
			'standard:connect': {
				version: '1.0.0',
				connect: async ({ silent } = {}) => {
					const result = await send({
						chain: 'sol',
						method: silent === true ? 'sol_accounts' : 'sol_connect',
						params: {}
					});
					setSolAccount(result?.address);
					return { accounts: solWallet.accounts };
				}
			},
			'standard:disconnect': {
				version: '1.0.0',
				disconnect: async () => {
					await send({ chain: 'sol', method: 'sol_disconnect', params: {} });
					setSolAccount(null);
				}
			},
			'standard:events': {
				version: '1.0.0',
				// eslint-disable-next-line local-rules/prefer-object-params -- EIP-1193 signature
				on: (name, listener) => {
					if (name !== 'change') {
						return () => undefined;
					}
					solChangeListeners.add(listener);
					return () => solChangeListeners.delete(listener);
				}
			},
			'solana:signMessage': {
				version: '1.0.0',
				signMessage: async (...inputs) => {
					const outputs = [];
					for (const { message } of inputs) {
						const { signature } = await send({
							chain: 'sol',
							method: 'sol_signMessage',
							params: { message: base58Encode(message) }
						});
						outputs.push({ signedMessage: message, signature: base58Decode(signature) });
					}
					return outputs;
				}
			},
			'solana:signTransaction': {
				version: '1.0.0',
				supportedTransactionVersions: ['legacy', 0],
				signTransaction: async (...inputs) => {
					const outputs = [];
					for (const { account, transaction, chain } of inputs) {
						assertSolChain(chain);
						const { signature } = await send({
							chain: 'sol',
							method: 'sol_signTransaction',
							params: { transaction: bytesToBase64(transaction) }
						});
						outputs.push({
							signedTransaction: insertSolSignature({
								transaction,
								signature: base58Decode(signature),
								publicKey: account.publicKey
							})
						});
					}
					return outputs;
				}
			},
			'solana:signAndSendTransaction': {
				version: '1.0.0',
				supportedTransactionVersions: ['legacy', 0],
				signAndSendTransaction: async (...inputs) => {
					const outputs = [];
					for (const { transaction, chain } of inputs) {
						assertSolChain(chain);
						const { signature } = await send({
							chain: 'sol',
							method: 'sol_signAndSendTransaction',
							params: { transaction: bytesToBase64(transaction) }
						});
						outputs.push({ signature: base58Decode(signature) });
					}
					return outputs;
				}
			}
		}
	};

	// Same two-way handshake as `registerWallet` from @wallet-standard/wallet: announce now for apps
	// that are already listening, and answer apps that load later.
	const registerSolWallet = ({ register }) => register(solWallet);
	window.dispatchEvent(
		new CustomEvent('wallet-standard:register-wallet', { detail: registerSolWallet })
	);
	window.addEventListener('wallet-standard:app-ready', ({ detail }) => registerSolWallet(detail));
})();
