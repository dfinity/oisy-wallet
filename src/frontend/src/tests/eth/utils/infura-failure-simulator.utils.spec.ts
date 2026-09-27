import {
	parseSimulatedInfuraFailure,
	simulateInfuraFailureIfEnabled
} from '$eth/utils/infura-failure-simulator.utils';
import { PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS } from '$lib/enums/plausible';

const { mockTestBuild } = vi.hoisted(() => ({ mockTestBuild: { value: true } }));

vi.mock('$app/environment', () => ({ browser: true, dev: false, building: false }));

vi.mock(import('$lib/constants/app.constants'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		get LOCAL() {
			return mockTestBuild.value;
		},
		get STAGING() {
			return false;
		}
	};
});

describe('infura-failure-simulator.utils', () => {
	const { SUBMISSION, NONCE, FEE } = PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS;

	describe('parseSimulatedInfuraFailure', () => {
		it('should be off without a call to fail', () => {
			expect(parseSimulatedInfuraFailure(undefined)).toBeUndefined();
			expect(parseSimulatedInfuraFailure('')).toBeUndefined();
			expect(parseSimulatedInfuraFailure('silent,both')).toBeUndefined();
		});

		it('should read the calls and the modifiers, whatever the case and spacing', () => {
			expect(parseSimulatedInfuraFailure(' Nonce , SILENT ')).toEqual({
				operations: [NONCE],
				silent: true,
				forwarded: false,
				both: false
			});
		});

		it('should read all as every call', () => {
			expect(parseSimulatedInfuraFailure('all,both')).toEqual({
				operations: [SUBMISSION, NONCE, FEE],
				silent: false,
				forwarded: false,
				both: true
			});
		});
	});

	describe('simulateInfuraFailureIfEnabled', () => {
		const call = vi.fn();

		const simulate = (params: {
			operation: PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS;
			provider: 'infura' | 'alchemy';
		}) => simulateInfuraFailureIfEnabled({ ...params, call });

		const setSwitch = (value: string) =>
			localStorage.setItem('OISY_SIMULATE_INFURA_FAILURE', value);

		beforeEach(() => {
			vi.clearAllMocks();

			call.mockReset();
			call.mockResolvedValue('answer');

			mockTestBuild.value = true;

			localStorage.clear();
		});

		it('should make the real call when the switch is off', async () => {
			await expect(simulate({ operation: NONCE, provider: 'infura' })).resolves.toBe('answer');

			expect(call).toHaveBeenCalledOnce();
		});

		it('should make the real call for a call the switch does not name', async () => {
			setSwitch('fee');

			await expect(simulate({ operation: NONCE, provider: 'infura' })).resolves.toBe('answer');
		});

		it('should fail an Infura call with a bare internal error, without making it', async () => {
			setSwitch('nonce');

			await expect(simulate({ operation: NONCE, provider: 'infura' })).rejects.toMatchObject({
				code: 'UNKNOWN_ERROR',
				error: { code: -32603, message: 'Internal error' }
			});

			expect(call).not.toHaveBeenCalled();
		});

		it('should leave an Infura call unanswered when silent', async () => {
			setSwitch('fee,silent');

			const settled = await Promise.race([
				simulate({ operation: FEE, provider: 'infura' }).then(() => 'settled'),
				new Promise((resolve) => setTimeout(() => resolve('pending'), 20))
			]);

			expect(settled).toBe('pending');
			expect(call).not.toHaveBeenCalled();
		});

		it('should pass a forwarded submission on and then fail the request', async () => {
			setSwitch('submission,forwarded');

			await expect(simulate({ operation: SUBMISSION, provider: 'infura' })).rejects.toMatchObject({
				code: 'UNKNOWN_ERROR'
			});

			expect(call).toHaveBeenCalledOnce();
		});

		it('should let Alchemy answer unless both are to fail', async () => {
			setSwitch('nonce');

			await expect(simulate({ operation: NONCE, provider: 'alchemy' })).resolves.toBe('answer');

			setSwitch('nonce,both');

			await expect(simulate({ operation: NONCE, provider: 'alchemy' })).rejects.toMatchObject({
				code: 'UNKNOWN_ERROR'
			});
		});

		it('should read the query param over localStorage', async () => {
			setSwitch('nonce');
			window.history.replaceState({}, '', '?simulate_infura_failure=fee');

			await expect(simulate({ operation: NONCE, provider: 'infura' })).resolves.toBe('answer');
			await expect(simulate({ operation: FEE, provider: 'infura' })).rejects.toMatchObject({
				code: 'UNKNOWN_ERROR'
			});

			window.history.replaceState({}, '', '/');
		});

		it('should never fail a call outside a local or test build', async () => {
			mockTestBuild.value = false;
			setSwitch('all,both');

			await expect(simulate({ operation: SUBMISSION, provider: 'infura' })).resolves.toBe('answer');
		});
	});
});
