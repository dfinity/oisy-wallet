import {
	clearMobileBack,
	connectMobileHost,
	connectMobileInteractions,
	finishMobileRefresh,
	mobileHostAvailable,
	navigateMobileHost,
	openMobileAccount,
	prepareMobileBack,
	publishMobileNavigation,
	requestMobileWallet,
	setMobilePresentation
} from '$lib/services/mobile-host.services';
import { Capacitor } from '@capacitor/core';

const { host } = vi.hoisted(() => ({
	host: {
		ready: vi.fn(),
		wallet: vi.fn(),
		navigate: vi.fn(),
		navigationState: vi.fn(),
		prepareBack: vi.fn(),
		clearBack: vi.fn(),
		finishRefresh: vi.fn(),
		presentation: vi.fn(),
		openAccount: vi.fn(),
		addListener:
			vi.fn<
				(
					event: string,
					listener: (value: unknown) => void
				) => Promise<{ remove: () => Promise<void> }>
			>()
	}
}));
vi.mock('@capacitor/core', () => ({
	registerPlugin: () => host,
	Capacitor: { isNativePlatform: vi.fn(), getPlatform: vi.fn() }
}));

describe('mobile host boundary', () => {
	const remove = vi.fn();
	const state = {
		version: 2,
		mode: 'audit-read-only',
		root: 'wallet',
		runtimeId: '82ef3353-9d37-45d2-8106-af14b19e3195',
		capabilities: ['nativeNavigation', 'account', 'delegation']
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv('VITE_MOBILE_SHELL', 'true');
		vi.stubGlobal('location', new URL('capacitor://localhost/'));
		vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
		vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
		host.ready.mockResolvedValue(state);
		host.addListener.mockResolvedValue({ remove });
		remove.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	it('does not enable the host for a normal website or development server', () => {
		for (const origin of [
			'https://audit.oisy.com',
			'https://localhost',
			'capacitor://localhost.evil',
			'http://127.0.0.1:5173'
		]) {
			vi.stubGlobal('location', new URL(origin));

			expect(mobileHostAvailable()).toBeFalsy();
		}
		vi.stubGlobal('location', new URL('capacitor://localhost'));
		vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

		expect(mobileHostAvailable()).toBeFalsy();
	});

	it('requires the mobile build flag', async () => {
		vi.stubEnv('VITE_MOBILE_SHELL', 'false');

		await expect(connectMobileHost(vi.fn())).rejects.toThrow('unavailable');
		await expect(navigateMobileHost('wallet')).rejects.toThrow('unavailable');
		await expect(openMobileAccount()).rejects.toThrow('unavailable');
		await expect(setMobilePresentation(true)).rejects.toThrow('unavailable');
		await expect(prepareMobileBack({ root: 'wallet', backPath: '/' })).rejects.toThrow(
			'unavailable'
		);
		await expect(finishMobileRefresh(1)).rejects.toThrow('unavailable');
		await expect(clearMobileBack()).rejects.toThrow('unavailable');
		await expect(
			connectMobileInteractions({ onBack: vi.fn(), onRefresh: vi.fn() })
		).rejects.toThrow('unavailable');
		expect(host.presentation).not.toHaveBeenCalled();
		expect(host.addListener).not.toHaveBeenCalled();
	});

	it('handles only current validated native interactions and removes both listeners', async () => {
		const onBack = vi.fn();
		const onRefresh = vi.fn().mockResolvedValue(undefined);
		const disconnect = await connectMobileInteractions({ onBack, onRefresh });
		const back = host.addListener.mock.calls.find(([name]) => name === 'back')?.[1];
		const refresh = host.addListener.mock.calls.find(([name]) => name === 'refresh')?.[1];
		back?.({ version: 2, url: 'https://evil.example' });
		back?.({ version: 1 });
		refresh?.({ version: 2, requestId: -1 });
		refresh?.({ version: 2, requestId: 1, extra: true });

		expect(onBack).not.toHaveBeenCalled();
		expect(onRefresh).not.toHaveBeenCalled();

		back?.({ version: 2 });
		refresh?.({ version: 2, requestId: 2 });
		refresh?.({ version: 2, requestId: 1 });
		refresh?.({ version: 2, requestId: 2 });

		expect(onBack).toHaveBeenCalledOnce();
		expect(onRefresh).toHaveBeenCalledExactlyOnceWith(2);

		await disconnect();
		back?.({ version: 2 });
		refresh?.({ version: 2, requestId: 3 });

		expect(remove).toHaveBeenCalledTimes(2);
		expect(onBack).toHaveBeenCalledOnce();
		expect(onRefresh).toHaveBeenCalledOnce();
	});

	it('cleans up the Back listener if refresh registration fails', async () => {
		host.addListener.mockResolvedValueOnce({ remove }).mockRejectedValueOnce(new Error('closed'));

		await expect(
			connectMobileInteractions({ onBack: vi.fn(), onRefresh: vi.fn() })
		).rejects.toThrow('closed');
		expect(remove).toHaveBeenCalledOnce();
	});

	it('captures only a bounded matching list parent and acknowledges the exact refresh', async () => {
		await prepareMobileBack({ root: 'search', backPath: '/?search=true&network=ICP' });
		await finishMobileRefresh(7);
		await clearMobileBack();

		expect(host.prepareBack).toHaveBeenCalledExactlyOnceWith({
			version: 2,
			root: 'search',
			backPath: '/?search=true&network=ICP'
		});
		expect(host.finishRefresh).toHaveBeenCalledExactlyOnceWith({ version: 2, requestId: 7 });
		expect(host.clearBack).toHaveBeenCalledExactlyOnceWith({ version: 2 });
		await expect(
			prepareMobileBack({ root: 'wallet', backPath: '/?search=true' })
		).rejects.toThrow();
		await expect(
			prepareMobileBack({ root: 'wallet', backPath: 'https://example.com/' })
		).rejects.toThrow();
		await expect(prepareMobileBack({ root: 'wallet', backPath: 'http://[' })).rejects.toThrow();
		await expect(finishMobileRefresh(Number.NaN)).rejects.toThrow();
		expect(host.prepareBack).toHaveBeenCalledOnce();
		expect(host.finishRefresh).toHaveBeenCalledOnce();
	});

	it('reserves the Android https local origin without accepting iOS https', () => {
		vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
		vi.stubGlobal('location', new URL('https://localhost'));

		expect(mobileHostAvailable()).toBeTruthy();
	});

	it('subscribes before reading the root and releases its listener on unmount', async () => {
		const navigate = vi.fn();
		const connection = await connectMobileHost(navigate);

		expect(host.addListener.mock.invocationCallOrder[0]).toBeLessThan(
			host.ready.mock.invocationCallOrder[0]
		);
		expect(navigate).toHaveBeenCalledWith({ screen: 'wallet', requestId: 0 });
		expect(connection.runtimeId).toBe(state.runtimeId);

		await connection.disconnect();

		expect(remove).toHaveBeenCalledOnce();
	});

	it.each([
		{ ...state, version: 3 },
		{ ...state, mode: 'live' },
		{ ...state, runtimeId: 'invalid' },
		{ ...state, capabilities: ['sign'] }
	])('fails closed for an incompatible handshake %j', async (response) => {
		host.ready.mockResolvedValue(response);

		await expect(connectMobileHost(vi.fn())).rejects.toThrow();
		expect(remove).toHaveBeenCalledOnce();
	});

	it('does not replace a newer selection with an older handshake response', async () => {
		const navigate = vi.fn();
		host.ready.mockImplementationOnce(() => {
			const [[, listener]] = host.addListener.mock.calls;
			listener({ version: 2, root: 'search', requestId: 2 });
			return Promise.resolve({ ...state, requestId: 1 });
		});
		await connectMobileHost(navigate);

		expect(navigate).toHaveBeenCalledExactlyOnceWith({ screen: 'search', requestId: 2 });
	});

	it('removes the listener if the native handshake fails', async () => {
		host.ready.mockRejectedValueOnce(new Error('not ready'));

		await expect(connectMobileHost(vi.fn())).rejects.toThrow('not ready');
		expect(remove).toHaveBeenCalledOnce();
	});

	it('ignores arbitrary routes, unknown versions and injected fields', async () => {
		const navigate = vi.fn();
		await connectMobileHost(navigate);
		const [[, listener]] = host.addListener.mock.calls;
		navigate.mockClear();
		for (const bad of [
			null,
			{ version: 3, root: 'wallet' },
			{ version: 2, root: 'https://evil' },
			{ version: 2, root: 'search', script: 'x' }
		]) {
			listener(bad);
		}

		expect(navigate).not.toHaveBeenCalled();

		listener({ version: 2, root: 'activity' });

		expect(navigate).toHaveBeenCalledExactlyOnceWith({ screen: 'activity', requestId: 0 });
	});

	it.each(['notes', 'earn', 'borrow', 'search'])(
		'accepts the fixed More destination %s',
		async (root) => {
			const navigate = vi.fn();
			await connectMobileHost(navigate);
			const [[, listener]] = host.addListener.mock.calls;
			navigate.mockClear();
			listener({ version: 2, root });

			expect(navigate).toHaveBeenCalledExactlyOnceWith({ screen: root, requestId: 0 });
		}
	);

	it('sends typed commands without URLs or JavaScript payloads', async () => {
		await navigateMobileHost('search');
		await openMobileAccount();

		expect(host.navigate).toHaveBeenCalledExactlyOnceWith({ version: 2, root: 'search' });
		expect(host.openAccount).toHaveBeenCalledExactlyOnceWith({ version: 2 });
	});

	it('reports committed navigation with bounded parent and request identity', async () => {
		await publishMobileNavigation({
			root: 'search',
			requestId: 7,
			revision: 12,
			backPath: '/?search=true&network=InternetComputer'
		});

		expect(host.navigationState).toHaveBeenCalledExactlyOnceWith({
			version: 2,
			root: 'search',
			requestId: 7,
			revision: 12,
			backPath: '/?search=true&network=InternetComputer'
		});
	});

	it.each([
		'https://evil.test/',
		'//evil.test/',
		'/transactions/?token=ICP',
		'/?url=https://evil.test',
		'/?network=ICP&network=ETH',
		'/?search=false',
		'/?network=',
		'/?search=true',
		'/#secret'
	])('rejects an unsupported parent %s before crossing the host', async (backPath) => {
		await expect(
			publishMobileNavigation({ root: 'wallet', requestId: 1, revision: 1, backPath })
		).rejects.toThrow();
		expect(host.navigationState).not.toHaveBeenCalled();
	});

	it.each([-1, 0.5, Number.MAX_SAFE_INTEGER + 1])(
		'rejects invalid request identities %s',
		async (requestId) => {
			await expect(
				publishMobileNavigation({ root: 'wallet', requestId, revision: 1 })
			).rejects.toThrow();
			expect(host.navigationState).not.toHaveBeenCalled();
		}
	);

	it('preserves host request IDs and ignores invalid IDs', async () => {
		const navigate = vi.fn();
		await connectMobileHost(navigate);
		const [[, listener]] = host.addListener.mock.calls;
		navigate.mockClear();
		listener({ version: 2, root: 'search', requestId: 8 });
		listener({ version: 2, root: 'wallet', requestId: -1 });

		expect(navigate).toHaveBeenCalledExactlyOnceWith({ screen: 'search', requestId: 8 });
	});

	it('only sends a presentation flag to the native shell', async () => {
		await setMobilePresentation(true);
		await setMobilePresentation(false);

		expect(host.presentation.mock.calls).toEqual([
			[{ version: 2, blocking: true }],
			[{ version: 2, blocking: false }]
		]);
	});

	it('validates wallet commands before crossing the bridge', async () => {
		host.wallet.mockResolvedValue({ response: '{}' });

		await expect(requestMobileWallet({ method: 'sessionExpired' })).resolves.toBe('{}');
		expect(host.wallet).toHaveBeenCalledExactlyOnceWith({
			version: 2,
			request: { method: 'sessionExpired' }
		});
		await expect(requestMobileWallet({ method: 'sign' })).rejects.toThrow();
		await expect(
			requestMobileWallet({ method: 'authorize', publicKey: 'key', url: 'https://evil' })
		).rejects.toThrow();

		host.wallet.mockResolvedValue({ response: 'x'.repeat(65_537) });

		await expect(requestMobileWallet({ method: 'sessionExpired' })).rejects.toThrow();
	});
});
