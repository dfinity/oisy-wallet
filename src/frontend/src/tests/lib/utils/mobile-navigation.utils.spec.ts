import { mobileRouteAllowed } from '$lib/utils/mobile-navigation.utils';

describe('mobile routes', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('allows integrated HTTPS routes only on the current website origin', () => {
		vi.stubGlobal('location', new URL('https://audit.oisy.com/'));
		for (const path of [
			'/',
			'/activity/',
			'/transactions/?token=ICP&network=InternetComputer',
			'/notes/'
		]) {
			expect(mobileRouteAllowed(new URL(path, location.href))).toBeTruthy();
		}
		for (const url of [
			'https://oisy.com/',
			'https://app.uniswap.org/',
			'https://audit.oisy.com/nfts/',
			'https://audit.oisy.com/?redirect=https://evil.test'
		]) {
			expect(mobileRouteAllowed(new URL(url))).toBeFalsy();
		}
	});

	it.each([
		'/',
		'/activity/',
		'/transactions/?network=InternetComputer&token=ryjl3-tyaaa-aaaaa-aaaba-cai',
		'/?search=true',
		'/settings/',
		'/notes/',
		'/earn/',
		'/borrow/'
	])('accepts the shared local route %s', (path) =>
		expect(mobileRouteAllowed(new URL(`oisy-test://localhost${path}`))).toBeTruthy()
	);

	it.each([
		'https://localhost/',
		'oisy-test://localhost.evil/',
		'oisy-test://user@localhost/',
		'oisy-test://localhost:443/',
		'oisy-test://localhost/mobile/',
		'oisy-test://localhost/?redirect=https://evil.test',
		'oisy-test://localhost/send/',
		'https://app.uniswap.org/'
	])('rejects %s', (path) => expect(mobileRouteAllowed(new URL(path))).toBeFalsy());
});
