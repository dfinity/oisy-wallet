import { mobileHostAvailable as hostAvailable } from '$lib/providers/mobile-host.providers';
import {
	clearMobileBack,
	connectMobileHost,
	connectMobileInteractions,
	finishMobileRefresh,
	navigateMobileHost,
	openMobileAccount,
	prepareMobileBack,
	publishMobileNavigation,
	requestMobileWallet,
	setMobilePresentation
} from '$lib/services/mobile-host.services';

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
vi.mock('$lib/providers/mobile-host.providers', () => ({
	mobileHostTransport: host,
	mobileHostAvailable: vi.fn()
}));

describe('mobile host boundary', () => {
	const remove = vi.fn();
	const documentId = '1696411f-bd18-408d-9a52-868595de827e';
	const state = {
		version: 2,
		documentId,
		mode: 'audit-read-only',
		root: 'wallet',
		runtimeId: '82ef3353-9d37-45d2-8106-af14b19e3195',
		hostVersion: '0.1.0',
		environment: 'audit',
		capabilities: ['nativeNavigation', 'account', 'delegation', 'sessionHandoff', 'documentBinding']
	};

	beforeEach(async () => {
		vi.clearAllMocks();
		vi.mocked(hostAvailable).mockReturnValue(true);
		host.ready.mockResolvedValue(state);
		host.addListener.mockResolvedValue({ remove });
		remove.mockResolvedValue(undefined);
		await connectMobileHost(vi.fn());
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	it('requires the WebKit host for every command and listener', async () => {
		vi.mocked(hostAvailable).mockReturnValue(false);

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
		back?.({ version: 2, documentId, url: 'https://evil.example' });
		back?.({ version: 1 });
		refresh?.({ version: 2, documentId, requestId: -1 });
		refresh?.({ version: 2, documentId, requestId: 1, extra: true });

		expect(onBack).not.toHaveBeenCalled();
		expect(onRefresh).not.toHaveBeenCalled();

		back?.({ version: 2, documentId });
		refresh?.({ version: 2, documentId, requestId: 2 });
		refresh?.({ version: 2, documentId, requestId: 1 });
		refresh?.({ version: 2, documentId, requestId: 2 });

		expect(onBack).toHaveBeenCalledOnce();
		expect(onRefresh).toHaveBeenCalledExactlyOnceWith(2);

		await disconnect();
		back?.({ version: 2, documentId });
		refresh?.({ version: 2, documentId, requestId: 3 });

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
			documentId,
			root: 'search',
			backPath: '/?search=true&network=ICP'
		});
		expect(host.finishRefresh).toHaveBeenCalledExactlyOnceWith({
			version: 2,
			documentId,
			requestId: 7
		});
		expect(host.clearBack).toHaveBeenCalledExactlyOnceWith({ version: 2, documentId });
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

	it('accepts bounded additive capabilities but requires the authentication contract', async () => {
		host.ready.mockResolvedValue({
			...state,
			capabilities: [...state.capabilities, 'futureScanner'],
			futureMetadata: true
		});

		await expect(connectMobileHost(vi.fn())).resolves.toMatchObject({ documentId });

		host.ready.mockResolvedValue({ ...state, documentId: 'invalid' });

		await expect(connectMobileHost(vi.fn())).rejects.toThrow();
	});

	it('ignores old-document events and forbids commands after disconnect', async () => {
		const navigate = vi.fn();
		const connection = await connectMobileHost(navigate);
		const listener = host.addListener.mock.calls.at(-1)?.[1];
		navigate.mockClear();
		listener?.({ version: 2, documentId: crypto.randomUUID(), root: 'activity', requestId: 7 });

		expect(navigate).not.toHaveBeenCalled();

		await connection.disconnect();

		await expect(requestMobileWallet({ method: 'signOut' })).rejects.toThrow('unavailable');
		expect(host.wallet).not.toHaveBeenCalled();
	});

	it('does not replace a newer selection with an older handshake response', async () => {
		const navigate = vi.fn();
		host.ready.mockImplementationOnce(() => {
			const [[, listener]] = host.addListener.mock.calls;
			listener({ version: 2, documentId, root: 'search', requestId: 2 });
			return Promise.resolve({ ...state, requestId: 1 });
		});
		await connectMobileHost(navigate);

		expect(navigate).toHaveBeenCalledExactlyOnceWith({ screen: 'search', requestId: 2 });
	});

	it('retains a current-document selection when stale events precede the handshake', async () => {
		const navigate = vi.fn();
		host.ready.mockImplementationOnce(() => {
			const [[, listener]] = host.addListener.mock.calls;
			listener({ version: 2, documentId, root: 'activity', requestId: 2 });
			listener({ version: 2, documentId: crypto.randomUUID(), root: 'search', requestId: 3 });
			return Promise.resolve({ ...state, requestId: 1 });
		});
		await connectMobileHost(navigate);

		expect(navigate).toHaveBeenCalledExactlyOnceWith({ screen: 'activity', requestId: 2 });
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
			{ version: 2, documentId, root: 'https://evil' },
			{ version: 2, documentId, root: 'search', script: 'x' }
		]) {
			listener(bad);
		}

		expect(navigate).not.toHaveBeenCalled();

		listener({ version: 2, documentId, root: 'activity' });

		expect(navigate).toHaveBeenCalledExactlyOnceWith({ screen: 'activity', requestId: 0 });
	});

	it.each(['notes', 'earn', 'borrow', 'search'])(
		'accepts the fixed More destination %s',
		async (root) => {
			const navigate = vi.fn();
			await connectMobileHost(navigate);
			const [[, listener]] = host.addListener.mock.calls;
			navigate.mockClear();
			listener({ version: 2, documentId, root });

			expect(navigate).toHaveBeenCalledExactlyOnceWith({ screen: root, requestId: 0 });
		}
	);

	it('sends typed commands without URLs or JavaScript payloads', async () => {
		await navigateMobileHost('search');
		await openMobileAccount();

		expect(host.navigate).toHaveBeenCalledExactlyOnceWith({
			version: 2,
			documentId,
			root: 'search'
		});
		expect(host.openAccount).toHaveBeenCalledExactlyOnceWith({ version: 2, documentId });
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
			documentId,
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
		listener({ version: 2, documentId, root: 'search', requestId: 8 });
		listener({ version: 2, documentId, root: 'wallet', requestId: -1 });

		expect(navigate).toHaveBeenCalledExactlyOnceWith({ screen: 'search', requestId: 8 });
	});

	it('only sends a presentation flag to the native shell', async () => {
		await setMobilePresentation(true);
		await setMobilePresentation(false);

		expect(host.presentation.mock.calls).toEqual([
			[{ version: 2, documentId, blocking: true }],
			[{ version: 2, documentId, blocking: false }]
		]);
	});

	it('validates wallet commands before crossing the bridge', async () => {
		host.wallet.mockResolvedValue({ response: '{}' });

		await expect(requestMobileWallet({ method: 'sessionExpired' })).resolves.toBe('{}');
		expect(host.wallet).toHaveBeenCalledExactlyOnceWith({
			version: 2,
			documentId,
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
