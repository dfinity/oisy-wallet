describe('runtime mobile selection', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	it('keeps ordinary website visits on browser auth even with the retired build flag', async () => {
		vi.stubEnv('VITE_MOBILE_SHELL', 'true');
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
