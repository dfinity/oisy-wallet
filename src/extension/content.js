/* global chrome */
// Runs in the extension's isolated world on the dapp page. It only carries messages between the
// injected providers and the background worker. The background worker learns the site's origin
// from the browser (the port's sender), never from what the page writes into a message.
(() => {
	const TARGET_CONTENT = 'oisy-extension:content';
	const TARGET_INPAGE = 'oisy-extension:inpage';

	const pendingIds = new Set();
	let port = null;

	const toPage = (message) =>
		window.postMessage({ ...message, target: TARGET_INPAGE }, window.location.origin);

	const failPending = (message) => {
		for (const id of pendingIds) {
			toPage({ id, error: { code: 4900, message } });
		}
		pendingIds.clear();
	};

	const connect = () => {
		port = chrome.runtime.connect({ name: 'oisy-dapp' });
		port.onMessage.addListener((message) => {
			if (message.type !== 'event') {
				pendingIds.delete(message.id);
			}
			toPage(message);
		});
		port.onDisconnect.addListener(() => {
			port = null;
			failPending('The OISY extension disconnected. Try again.');
		});
	};

	window.addEventListener('message', (event) => {
		if (event.source !== window || event.origin !== window.location.origin) {
			return;
		}
		const { data } = event;
		if (data?.target !== TARGET_CONTENT) {
			return;
		}

		const { id, chain, method, params } = data;
		try {
			if (port === null) {
				connect();
			}
			pendingIds.add(id);
			port.postMessage({ id, chain, method, params });
		} catch (_) {
			pendingIds.delete(id);
			toPage({ id, error: { code: 4900, message: 'The OISY extension is not available.' } });
		}
	});
})();
