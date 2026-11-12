// Navigation is deliberately limited to the integrated shared feature pages.
export const mobileRouteAllowed = (url: URL): boolean =>
	((url.protocol === 'oisy-test:' && url.hostname === 'localhost') ||
		(url.protocol === 'https:' && url.origin === globalThis.location?.origin)) &&
	!url.port &&
	!url.username &&
	!url.password &&
	[
		'/',
		'/index.html',
		'/activity/',
		'/transactions/',
		'/settings/',
		'/notes/',
		'/earn/',
		'/borrow/'
	].includes(url.pathname) &&
	[...url.searchParams.keys()].every((key) => ['network', 'token', 'search'].includes(key));
