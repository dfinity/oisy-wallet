import {
	connectMobileHost,
	mobileHostAvailable,
	navigateMobileHost,
	openMobileAccount,
	requestMobileWallet,
	setMobilePresentation
} from '$lib/services/mobile-host.services';
import { Capacitor } from '@capacitor/core';

const { host } = vi.hoisted(() => ({
	host: {
		ready: vi.fn(),
		wallet: vi.fn(),
		navigate: vi.fn(),
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
		expect(host.presentation).not.toHaveBeenCalled();
		expect(host.addListener).not.toHaveBeenCalled();
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
		expect(navigate).toHaveBeenCalledWith('wallet');
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

		expect(navigate).toHaveBeenCalledExactlyOnceWith('activity');
	});

	it.each(['notes', 'earn', 'borrow', 'search'])(
		'accepts the fixed More destination %s',
		async (root) => {
			const navigate = vi.fn();
			await connectMobileHost(navigate);
			const [[, listener]] = host.addListener.mock.calls;
			navigate.mockClear();
			listener({ version: 2, root });

			expect(navigate).toHaveBeenCalledExactlyOnceWith(root);
		}
	);

	it('sends typed commands without URLs or JavaScript payloads', async () => {
		await navigateMobileHost('search');
		await openMobileAccount();

		expect(host.navigate).toHaveBeenCalledExactlyOnceWith({ version: 2, root: 'search' });
		expect(host.openAccount).toHaveBeenCalledExactlyOnceWith({ version: 2 });
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
