/* global __OISY_BOOTSTRAP__ */
(() => {
	const config = __OISY_BOOTSTRAP__;
	if (
		window !== window.top ||
		location.protocol !== config.protocol ||
		location.hostname !== config.host ||
		location.port !== ''
	) {
		return;
	}
	const handler = window.webkit.messageHandlers.oisyHost;
	const listeners = new Map();
	const methods = new Set([
		'ready',
		'navigate',
		'navigationState',
		'prepareBack',
		'clearBack',
		'finishRefresh',
		'presentation',
		'sheet',
		'openAccount',
		'wallet'
	]);
	Object.defineProperty(window, '__oisyHost', {
		value: Object.freeze({
			version: 2,
			transport: 'wk',
			documentId: config.documentId,
			request: (...args) => {
				const [method, options] = args;
				if (!methods.has(method)) {
					return Promise.reject(new Error('Unsupported host request'));
				}
				return handler.postMessage({ documentId: config.documentId, method, options });
			},
			addListener: (...args) => {
				const [name, listener] = args;
				if (!['navigate', 'back', 'refresh', 'dismissSheet'].includes(name)) {
					return Promise.reject(new Error('Unsupported host event'));
				}
				const entries = listeners.get(name) ?? new Set();
				listeners.set(name, entries);
				entries.add(listener);
				return Promise.resolve({
					remove: () => {
						entries.delete(listener);
						return Promise.resolve();
					}
				});
			},
			receive: (...args) => {
				const [name, value] = args;
				if (value?.documentId !== config.documentId) {
					return;
				}
				for (const listener of listeners.get(name) ?? []) {
					listener(value);
				}
			}
		})
	});
})();
