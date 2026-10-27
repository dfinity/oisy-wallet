// Navigation is deliberately limited to the integrated shared feature pages.
export const mobileRouteAllowed = (url: URL): boolean =>
	url.protocol === 'capacitor:' &&
	url.hostname === 'localhost' &&
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
