// static/redirect-www.js
(() => {
	try {
		const loc = window.location;
		if (loc.hostname.startsWith('www.')) {
			const url = new URL(loc.href);
			url.hostname = loc.hostname.slice(4);
			window.location.replace(url.toString());
		}
	} catch (_) {
		/* empty */
	}
})();
