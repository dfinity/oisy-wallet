import { mobileRouteAllowed } from '$lib/utils/mobile-navigation.utils';

describe('mobile routes', () => {
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
		expect(mobileRouteAllowed(new URL(`capacitor://localhost${path}`))).toBeTruthy()
	);

	it.each([
		'https://localhost/',
		'capacitor://localhost.evil/',
		'capacitor://user@localhost/',
		'capacitor://localhost:443/',
		'capacitor://localhost/mobile/',
		'capacitor://localhost/?redirect=https://evil.test',
		'capacitor://localhost/send/',
		'https://app.uniswap.org/'
	])('rejects %s', (path) => expect(mobileRouteAllowed(new URL(path))).toBeFalsy());
});
