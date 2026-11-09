describe('runtime mobile selection', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.stubEnv('VITE_MOBILE_SHELL', 'false');
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	it('keeps ordinary website visits on browser auth', async () => {
		vi.stubGlobal('__oisyHost', undefined);
		const runtime = await import('$lib/constants/mobile.constants');

		expect(runtime.MOBILE_SHELL).toBeFalsy();
		expect(() => runtime.enableMobileWorkerRuntime()).toThrow('Worker runtime required');
	});

	it('selects mobile before auth even for an incompatible host, so it cannot fall back to IDB', async () => {
		vi.stubGlobal('__oisyHost', { version: 999 });
		const runtime = await import('$lib/constants/mobile.constants');

		expect(runtime.MOBILE_SHELL).toBeTruthy();
	});

	it('selects worker auth explicitly without a mobile build or Window', async () => {
		vi.stubGlobal('window', undefined);
		vi.stubGlobal('postMessage', vi.fn());
		const runtime = await import('$lib/constants/mobile.constants');

		expect(runtime.MOBILE_SHELL).toBeFalsy();

		runtime.enableMobileWorkerRuntime();

		expect(runtime.MOBILE_SHELL).toBeTruthy();
	});
});
