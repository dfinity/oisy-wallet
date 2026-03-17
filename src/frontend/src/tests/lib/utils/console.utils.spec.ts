import { consoleError, consoleWarn } from '$lib/utils/console.utils';
import type { MockInstance } from 'vitest';

describe('console.utils', () => {
	let errorSpy: MockInstance;
	let warnSpy: MockInstance;

	beforeEach(() => {
		vi.clearAllMocks();

		errorSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn());
	});

	afterEach(() => {
		errorSpy.mockRestore();
		warnSpy.mockRestore();
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
	});
});
