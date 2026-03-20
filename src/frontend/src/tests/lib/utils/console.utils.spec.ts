import { consoleError, consoleWarn } from '$lib/utils/console.utils';
import type { MockInstance } from 'vitest';

describe('console.utils', () => {
	let errorSpy: MockInstance;
	let warnSpy: MockInstance;
	let debugSpy: MockInstance;

	beforeEach(() => {
		vi.clearAllMocks();

		errorSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn());
		debugSpy = vi.spyOn(console, 'debug').mockImplementation(vi.fn());
	});

	afterEach(() => {
		errorSpy.mockRestore();
		warnSpy.mockRestore();
		debugSpy.mockRestore();
	});

	describe('consoleError', () => {
		it('should pass through non-IC errors unchanged', () => {
			const err = new Error('simple error');

			consoleError(err);

			expect(errorSpy).toHaveBeenCalledExactlyOnceWith(err);
		});

		it('should pass through string messages unchanged', () => {
			consoleError('some message');

			expect(errorSpy).toHaveBeenCalledExactlyOnceWith('some message');
		});

		it('should format IC call errors', () => {
			const err = new Error(
				'Reject\nCall context:\n  Canister ID: abc-cai\n  Method name: test\n  HTTP details: {"status":200}'
			);

			consoleError(err);

			expect(errorSpy).toHaveBeenCalledExactlyOnceWith(
				'Error: Reject\n  Canister ID: abc-cai\n  Method name: test'
			);
		});

		it('should handle multiple arguments with mixed IC and non-IC errors', () => {
			const icErr = new Error(
				'Reject\nCall context:\n  Canister ID: abc-cai\n  Method name: test\n  HTTP details: {"status":200}'
			);

			consoleError('Loading failed:', icErr);

			expect(errorSpy).toHaveBeenCalledExactlyOnceWith(
				'Loading failed:',
				'Error: Reject\n  Canister ID: abc-cai\n  Method name: test'
			);
		});

		it('should log verbose output with original args in non-prod environments', () => {
			const err = new Error(
				'Reject\nCall context:\n  Canister ID: abc-cai\n  Method name: test\n  HTTP details: {"status":200}'
			);

			consoleError('Loading failed:', err);

			expect(debugSpy).toHaveBeenCalledExactlyOnceWith('[verbose]', 'Loading failed:', err);
		});

		it('should not log verbose output in prod environments', async () => {
			vi.doMock('$lib/constants/app.constants', () => ({
				LOCAL: false,
				STAGING: false
			}));

			vi.resetModules();

			const { consoleError: consoleErrorProd } = await import('$lib/utils/console.utils');

			const err = new Error(
				'Reject\nCall context:\n  Canister ID: abc-cai\n  Method name: test\n  HTTP details: {"status":200}'
			);

			consoleErrorProd('Loading failed:', err);

			expect(debugSpy).not.toHaveBeenCalled();
		});
	});

	describe('consoleWarn', () => {
		it('should pass through non-IC errors unchanged', () => {
			const err = new Error('simple warning');

			consoleWarn(err);

			expect(warnSpy).toHaveBeenCalledExactlyOnceWith(err);
		});

		it('should format IC call errors', () => {
			const err = new Error(
				'Reject\nCall context:\n  Canister ID: xyz-cai\n  Method name: balance\n  HTTP details: {"status":200}'
			);

			consoleWarn(err);

			expect(warnSpy).toHaveBeenCalledExactlyOnceWith(
				'Error: Reject\n  Canister ID: xyz-cai\n  Method name: balance'
			);
		});

		it('should log verbose output with original args in non-prod environments', () => {
			const err = new Error(
				'Reject\nCall context:\n  Canister ID: xyz-cai\n  Method name: balance\n  HTTP details: {"status":200}'
			);

			consoleWarn(err);

			expect(debugSpy).toHaveBeenCalledExactlyOnceWith('[verbose]', err);
		});

		it('should not log verbose output in prod environments', async () => {
			vi.doMock('$lib/constants/app.constants', () => ({
				LOCAL: false,
				STAGING: false
			}));

			vi.resetModules();

			const { consoleWarn: consoleWarnProd } = await import('$lib/utils/console.utils');

			const err = new Error(
				'Reject\nCall context:\n  Canister ID: xyz-cai\n  Method name: balance\n  HTTP details: {"status":200}'
			);

			consoleWarnProd(err);

			expect(debugSpy).not.toHaveBeenCalled();
		});
	});
});
