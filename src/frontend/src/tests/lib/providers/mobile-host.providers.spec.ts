import { mobileHostAvailable, mobileHostTransport } from '$lib/providers/mobile-host.providers';
import { connectMobileHost, requestMobileWallet } from '$lib/services/mobile-host.services';
import type { WebKitMobileHost } from '$lib/types/mobile-host';

describe('live website host transport', () => {
	const documentId = '1696411f-bd18-408d-9a52-868595de827e';
	const request = vi.fn();
	const remove = vi.fn().mockResolvedValue(undefined);
	const addListener = vi.fn().mockResolvedValue({ remove });
	const host: WebKitMobileHost = { version: 2, transport: 'wk', documentId, request, addListener };
	const handshake = {
		version: 2,
		documentId,
		mode: 'audit-read-only',
		root: 'wallet',
		runtimeId: documentId,
		hostVersion: '0.1.0',
		environment: 'audit',
		capabilities: ['nativeNavigation', 'delegation', 'sessionHandoff', 'documentBinding']
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv('VITE_MOBILE_SHELL', 'false');
		vi.stubGlobal('location', new URL('https://audit.oisy.com/'));
		vi.stubGlobal('__oisyHost', host);
		request.mockResolvedValue({ ok: true, value: handshake });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	it('uses the same website build and binds requests to the negotiated document', async () => {
		expect(mobileHostAvailable()).toBeTruthy();

		const connection = await connectMobileHost(vi.fn());
		request.mockResolvedValue({ ok: true, value: { response: '{}' } });

		await expect(requestMobileWallet({ method: 'readOperations' })).resolves.toBe('{}');
		expect(request).toHaveBeenLastCalledWith('wallet', {
			version: 2,
			documentId,
			request: { method: 'readOperations' }
		});

		await connection.disconnect();

		await expect(requestMobileWallet({ method: 'readOperations' })).rejects.toThrow('unavailable');
	});

	it('does not enable the host in an ordinary browser or over HTTP', () => {
		vi.stubGlobal('__oisyHost', undefined);

		expect(mobileHostAvailable()).toBeFalsy();

		vi.stubGlobal('__oisyHost', host);
		vi.stubGlobal('location', new URL('http://audit.oisy.com'));

		expect(mobileHostAvailable()).toBeFalsy();
	});

	it('rejects unknown versions and missing capabilities before sending an auth key', async () => {
		vi.stubGlobal('__oisyHost', { ...host, version: 3 });

		await expect(connectMobileHost(vi.fn())).rejects.toThrow('unavailable');
		expect(request).not.toHaveBeenCalled();

		vi.stubGlobal('__oisyHost', host);
		request.mockResolvedValue({ ok: true, value: { ...handshake, capabilities: [] } });

		await expect(connectMobileHost(vi.fn())).rejects.toThrow('Unsupported host capabilities');
		expect(request).toHaveBeenCalledExactlyOnceWith('ready', { version: 2 });
	});

	it('does not accept the XCTest fixture origin in a deployment build', () => {
		vi.stubEnv('VITE_MOBILE_UI_TEST', 'false');
		vi.stubGlobal('location', new URL('capacitor://localhost/'));

		expect(mobileHostAvailable()).toBeFalsy();
	});

	it('keeps the journal conflict code and rejects malformed replies', async () => {
		request.mockResolvedValue({ ok: false, code: 'OPERATION_JOURNAL_CONFLICT' });

		await expect(mobileHostTransport.ready({ version: 2 })).rejects.toMatchObject({
			code: 'OPERATION_JOURNAL_CONFLICT'
		});

		request.mockResolvedValue({ response: '{}' });

		await expect(mobileHostTransport.ready({ version: 2 })).rejects.toThrow();
	});
});
