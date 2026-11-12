// EVM discovery/events adapted from the OISY extension (PR #14306).
// No private keys or signing credentials enter this page. Native WebKit origin checks own consent.
(() => {
	if (window.oisy) {
		return;
	}
	const listeners = new Map();
	let accounts = [];
	const emit = ({ name, value }) => {
		for (const listener of listeners.get(name) ?? []) {
			try {
				listener(value);
			} catch (_) {
				/* A dapp listener cannot stop other listeners. */
			}
		}
	};
	const emitAccounts = (value) => {
		if (JSON.stringify(value) !== JSON.stringify(accounts)) {
			accounts = [...value];
			emit({ name: 'accountsChanged', value: [...accounts] });
		}
	};
	const error = (value) => Object.assign(new Error(value.message), { code: value.code });
	const provider = {
		isOisy: true,
		isConnected: () => true,
		get chainId() {
			return '0xaa36a7';
		},
		get networkVersion() {
			return '11155111';
		},
		get selectedAddress() {
			return accounts[0] ?? null;
		},
		request: async ({ method, params = [] } = {}) => {
			if (typeof method !== 'string' || !method || params === null || typeof params !== 'object') {
				throw error({ code: -32602, message: 'Invalid provider request.' });
			}
			const message = JSON.stringify({ method, params });
			if (message.length > 65536) {
				throw error({ code: -32602, message: 'Request is too large.' });
			}
			const response = JSON.parse(await window.webkit.messageHandlers.oisy.postMessage(message));
			if (response.error) {
				throw error(response.error);
			}
			if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
				emitAccounts(response.result);
			}
			if (method === 'wallet_revokePermissions') {
				emitAccounts([]);
			}
			return response.result;
		},
		// EIP-1193 requires the positional EventEmitter API.
		// eslint-disable-next-line local-rules/prefer-object-params
		on: (name, listener) => {
			if (typeof listener !== 'function') {
				throw new TypeError('Listener must be a function.');
			}
			const set = listeners.get(name) ?? new Set();
			set.add(listener);
			listeners.set(name, set);
			return provider;
		},
		// EIP-1193 requires the positional EventEmitter API.
		// eslint-disable-next-line local-rules/prefer-object-params
		removeListener: (name, listener) => {
			listeners.get(name)?.delete(listener);
			return provider;
		}
	};
	provider.off = provider.removeListener;
	// Legacy async interface for older injected-wallet connectors; it uses the same native router.
	// The legacy JSON-RPC callback API also requires positional arguments.
	// eslint-disable-next-line local-rules/prefer-object-params
	provider.sendAsync = (payload, callback) =>
		provider.request(payload).then(
			(result) => callback(null, { id: payload.id, jsonrpc: '2.0', result }),
			(failure) => callback(failure, null)
		);
	Object.defineProperty(window, 'oisy', { value: Object.freeze({ provider, emitAccounts }) });
	if (!window.ethereum) {
		Object.defineProperty(window, 'ethereum', { value: provider, configurable: true });
	}
	const info = Object.freeze({
		uuid: crypto.randomUUID(),
		name: 'OISY',
		rdns: 'com.oisy',
		icon: 'data:image/svg+xml,%3Csvg%20width%3D%2264%22%20height%3D%2264%22%20viewBox%3D%220%200%2064%2064%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20clip-path%3D%22url%28%23clip0_558_3209%29%22%3E%3Ccircle%20cx%3D%2232%22%20cy%3D%2232%22%20r%3D%2232%22%20fill%3D%22url%28%23paint0_linear_558_3209%29%22%3E%3C%2Fcircle%3E%3Cpath%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20d%3D%22M35.5086%2048.6098L34.7387%2052.0151C34.6237%2052.5235%2034.1374%2052.859%2033.6222%2052.7793C32.4482%2052.5979%2031.2584%2052.3894%2030.0564%2052.1591C29.5045%2052.0534%2029.1526%2051.5103%2029.2765%2050.9622L29.9735%2047.8793C29.4854%2047.7837%2028.9942%2047.6803%2028.5005%2047.5697C28.0554%2047.4682%2027.6147%2047.3622%2027.1789%2047.2517L26.4822%2050.3336C26.3583%2050.8815%2025.8076%2051.2203%2025.264%2051.079C24.0798%2050.771%2022.916%2050.449%2021.778%2050.1097C21.2778%2049.9605%2020.9822%2049.448%2021.0973%2048.9389L21.8632%2045.5512C14.2939%2042.5159%209.51524%2037.3571%2011.5435%2028.5473L12.0315%2026.3886C13.9943%2017.5457%2020.5251%2014.9543%2028.6628%2015.4753L29.4282%2012.0899C29.5433%2011.5807%2030.0307%2011.2452%2030.5465%2011.3258C31.7197%2011.5091%2032.9088%2011.719%2034.1103%2011.9505C34.6618%2012.0567%2035.0132%2012.5995%2034.8893%2013.1473L34.1926%2016.2292C34.6335%2016.3169%2035.0769%2016.4109%2035.5224%2016.5107C36.016%2016.6223%2036.5041%2016.7393%2036.986%2016.8621L37.6823%2013.782C37.8062%2013.2339%2038.3575%2012.895%2038.9012%2013.037C40.0853%2013.3461%2041.2491%2013.6697%2042.387%2014.0108C42.8864%2014.1605%2043.1812%2014.6726%2043.0662%2015.1811L42.2985%2018.577C49.7691%2021.6116%2054.4382%2026.7666%2052.4573%2035.5281L51.9693%2037.6869C50.0233%2046.4547%2043.5626%2049.0795%2035.5086%2048.6098ZM46.4916%2035.933L46.7663%2034.7182C48.7004%2026.6813%2042.2694%2023.6796%2034.3411%2021.771C26.3257%2020.075%2019.2288%2020.0183%2017.5176%2028.1056L17.2429%2029.3204C15.3004%2037.3941%2021.7315%2040.3958%2029.6969%2042.3128C37.6752%2044.0004%2044.7721%2044.0571%2046.4916%2035.933Z%22%20fill%3D%22white%22%3E%3C%2Fpath%3E%3C%2Fg%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22paint0_linear_558_3209%22%20x1%3D%2232%22%20y1%3D%220%22%20x2%3D%2232%22%20y2%3D%2264%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20stop-color%3D%22%230066FF%22%3E%3C%2Fstop%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%230066FF%22%3E%3C%2Fstop%3E%3C%2FlinearGradient%3E%3CclipPath%20id%3D%22clip0_558_3209%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20fill%3D%22white%22%3E%3C%2Frect%3E%3C%2FclipPath%3E%3C%2Fdefs%3E%3C%2Fsvg%3E'
	});
	const announce = () =>
		window.dispatchEvent(
			new CustomEvent('eip6963:announceProvider', {
				detail: Object.freeze({ info, provider })
			})
		);
	window.addEventListener('eip6963:requestProvider', announce);
	announce();
	window.dispatchEvent(new Event('ethereum#initialized'));
})();
