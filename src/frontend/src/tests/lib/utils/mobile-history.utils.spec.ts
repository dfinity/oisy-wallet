import { createMobileHistory, mobileScreenPath } from '$lib/utils/mobile-history.utils';

const url = (path: string): URL => new URL(path, 'capacitor://localhost');
const tokenPath = '/transactions/?network=InternetComputer&token=ryjl3-tyaaa-aaaaa-aaaba-cai';

describe('mobile history', () => {
	it.each([
		{ screen: 'wallet', path: '/' },
		{ screen: 'activity', path: '/activity/' },
		{ screen: 'search', path: '/?search=true' },
		{ screen: 'notes', path: '/notes/' },
		{ screen: 'earn', path: '/earn/' },
		{ screen: 'borrow', path: '/borrow/' },
		{ screen: 'preferences', path: '/settings/' },
		{ screen: 'contacts', path: undefined }
	] as const)('maps $screen without inventing a Contacts route', ({ screen, path }) => {
		expect(mobileScreenPath(screen)).toBe(path);
	});

	it.each([
		{ parent: '/?network=Bitcoin', root: 'wallet' },
		{ parent: '/?search=true&network=InternetComputer', root: 'search' }
	] as const)('remembers the exact parent and root for $parent', ({ parent, root }) => {
		const history = createMobileHistory(url(parent));

		expect(history.commitRoute(url(tokenPath))).toBeTruthy();
		expect(history.state).toEqual({ path: tokenPath, root, backPath: parent, requestId: 0 });
		expect(history.canGoBack(url(parent))).toBeTruthy();
		expect(history.canGoBack(url('/activity/'))).toBeFalsy();
		expect(history.canGoBack(url('/'))).toBeFalsy();

		expect(history.commitRoute(url(parent))).toBeTruthy();
		expect(history.state).toEqual({ path: parent, root, requestId: 0 });
		expect(history.canGoBack(url(tokenPath))).toBeFalsy();
	});

	it('does not change the committed location before root navigation completes', () => {
		const history = createMobileHistory(url('/?search=true'));
		history.commitRoute(url(tokenPath));
		const previous = history.state;
		const request = history.prepareRoot({ screen: 'activity', requestId: 0 });
		assert(request);

		expect(request.replaceState).toBeTruthy();
		expect(history.state).toEqual(previous);
		expect(history.canGoBack(url('/?search=true'))).toBeFalsy();
		expect(history.commitRoute(url('/activity/'))).toBeFalsy();
		expect(history.commit({ transition: request, url: url('/notes/') })).toBeFalsy();
		expect(history.state).toEqual(previous);
		expect(history.commit({ transition: request, url: url('/activity/') })).toBeTruthy();
		expect(history.state).toEqual({ path: '/activity/', root: 'activity', requestId: 0 });
		expect(history.pending).toBeUndefined();
		expect(history.canGoBack(url('/?search=true'))).toBeFalsy();
	});

	it('acknowledges cancellation while preserving the token and its approved parent', () => {
		const history = createMobileHistory(url('/?network=Bitcoin'));
		history.commitRoute(url(tokenPath));
		const previous = history.state;
		const request = history.prepareRoot({ screen: 'activity', requestId: 4 });
		assert(request);

		expect(history.cancel(request)).toBeTruthy();
		expect(history.state).toEqual({ ...previous, requestId: 4 });
		expect(history.canGoBack(url('/?network=Bitcoin'))).toBeTruthy();
		expect(history.commit({ transition: request, url: url('/activity/') })).toBeFalsy();
		expect(history.prepareRoot({ screen: 'notes', requestId: 4 })).toBeUndefined();
	});

	it('does not let superseded root responses roll back the active request', () => {
		const history = createMobileHistory(url('/'));
		const earlier = history.prepareRoot({ screen: 'activity', requestId: 1 });
		const later = history.prepareRoot({ screen: 'notes', requestId: 2 });
		assert(earlier);
		assert(later);

		expect(history.commit({ transition: earlier, url: url('/activity/') })).toBeFalsy();
		expect(history.cancel(earlier)).toBeFalsy();
		expect(history.pending).toBe(later);
		expect(history.commit({ transition: later, url: url('/notes/') })).toBeTruthy();
		expect(history.state).toEqual({ path: '/notes/', root: 'notes', requestId: 2 });
	});

	it.each([-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
		'rejects invalid native request ID %s',
		(requestId) => {
			const history = createMobileHistory(url('/'));

			expect(history.prepareRoot({ screen: 'activity', requestId })).toBeUndefined();
			expect(history.state).toEqual({ path: '/', root: 'wallet', requestId: 0 });
		}
	);

	it('resets the parent even when a root selection stays on the same URL', () => {
		const history = createMobileHistory(url('/?search=true'));
		history.commitRoute(url(tokenPath));
		const wallet = history.prepareRoot({ screen: 'wallet', requestId: 1 });
		assert(wallet);
		history.commit({ transition: wallet, url: url('/') });
		const walletAgain = history.prepareRoot({ screen: 'wallet', requestId: 2 });
		assert(walletAgain);

		expect(history.commit({ transition: walletAgain, url: url('/') })).toBeTruthy();
		expect(history.state).toEqual({ path: '/', root: 'wallet', requestId: 2 });
		expect(history.canGoBack(url('/?search=true'))).toBeFalsy();
	});

	it('never treats another tab or a directly opened token as a list parent', () => {
		const direct = createMobileHistory(url(tokenPath));

		expect(direct.canGoBack(url('/'))).toBeFalsy();

		const history = createMobileHistory(url('/activity/'));
		history.commitRoute(url(tokenPath));

		expect(history.state.backPath).toBeUndefined();
		expect(history.canGoBack(url('/activity/'))).toBeFalsy();
	});

	it('does not invent a token-to-token stack or lose a parent on duplicate acknowledgement', () => {
		const history = createMobileHistory(url('/?search=true'));
		history.commitRoute(url(tokenPath));
		history.commitRoute(url(tokenPath));

		expect(history.canGoBack(url('/?search=true'))).toBeTruthy();

		history.commitRoute(url('/transactions/?network=Ethereum&token=ETH'));

		expect(history.state.backPath).toBeUndefined();
		expect(history.canGoBack(url(tokenPath))).toBeFalsy();
	});

	it('acknowledges Contacts without changing its underlying token or parent', () => {
		const history = createMobileHistory(url('/?search=true'));
		history.commitRoute(url(tokenPath));
		const previous = history.state;
		const request = history.prepareRoot({ screen: 'contacts', requestId: 1 });
		assert(request);

		expect(request.path).toBe(tokenPath);
		expect(history.cancel(request)).toBeTruthy();
		expect(history.state).toEqual({ ...previous, requestId: 1 });
	});

	it.each([
		'https://localhost/',
		'capacitor://localhost.evil/',
		'capacitor://localhost/?redirect=https://evil.test',
		'capacitor://localhost/send/'
	])('rejects unapproved initial locations, commits and Back targets: %s', (location) => {
		const rejected = new URL(location);

		expect(() => createMobileHistory(rejected)).toThrow('Unsupported mobile location');

		const history = createMobileHistory(url('/'));
		history.commitRoute(url(tokenPath));
		const previous = history.state;

		expect(history.commitRoute(rejected)).toBeFalsy();
		expect(history.canGoBack(rejected)).toBeFalsy();
		expect(history.state).toEqual(previous);
	});
});
