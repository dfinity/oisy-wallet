import { isNetworkUnreachableError } from '$lib/utils/error.utils';
import {
	simulateInfrastructureFailureIfEnabled,
	type SimulatedInfrastructureFailureMode
} from '$lib/utils/infrastructure-failure-simulator.utils';

vi.mock('$app/environment', () => ({ browser: true }));

// Getters, not plain values: the simulator reads the env at call time, so the production-gating
// test below can flip both flags off without re-importing the module.
const mockEnv = { LOCAL: true, STAGING: false };

vi.mock('$lib/constants/app.constants', () => ({
	get LOCAL() {
		return mockEnv.LOCAL;
	},
	get STAGING() {
		return mockEnv.STAGING;
	}
}));

describe('infrastructure-failure-simulator.utils', () => {
	const mockStorage = new Map<string, string>();

	const setSearch = (search: string) => {
		Object.defineProperty(window, 'location', {
			value: { search },
			writable: true,
			configurable: true
		});
	};

	const captureThrown = (target: 'profile' | 'rewards'): { threw: boolean; err: unknown } => {
		try {
			simulateInfrastructureFailureIfEnabled(target);
			return { threw: false, err: undefined };
		} catch (err: unknown) {
			return { threw: true, err };
		}
	};

	beforeEach(() => {
		mockEnv.LOCAL = true;
		mockEnv.STAGING = false;

		mockStorage.clear();
		setSearch('');

		// Stubbed rather than relying on the environment's own: a Node built-in `localStorage`
		// leaking into jsdom would otherwise make this suite fail for reasons unrelated to it.
		// Only `getItem` is stubbed: the simulator never writes, and the tests seed `mockStorage`
		// directly.
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => mockStorage.get(key) ?? null
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('opt-in', () => {
		it('should do nothing when not opted in', () => {
			expect(captureThrown('profile').threw).toBeFalsy();
		});

		it('should do nothing for an unrecognised mode', () => {
			setSearch('?simulate_infra_failure=nonsense');

			expect(captureThrown('profile').threw).toBeFalsy();
		});

		it('should throw when opted in via the query param', () => {
			setSearch('?simulate_infra_failure=offline');

			expect(captureThrown('profile').threw).toBeTruthy();
		});

		it('should throw when opted in via localStorage', () => {
			mockStorage.set('OISY_SIMULATE_INFRA_FAILURE', 'offline');

			expect(captureThrown('profile').threw).toBeTruthy();
		});

		it('should let the query param win over localStorage', () => {
			mockStorage.set('OISY_SIMULATE_INFRA_FAILURE', 'offline');
			setSearch('?simulate_infra_failure=nonsense');

			expect(captureThrown('profile').threw).toBeFalsy();
		});

		// The simulator runs inside a real API call, so an unusable `localStorage` must degrade to
		// "not opted in" rather than surface as a failure of the call it was meant to observe.
		it('should not throw when localStorage is unusable and no query param is set', () => {
			vi.stubGlobal('localStorage', {
				getItem: () => {
					throw new Error('SecurityError: access denied');
				}
			});

			expect(captureThrown('profile').threw).toBeFalsy();
		});

		it('should still honour the query param when localStorage is unusable', () => {
			vi.stubGlobal('localStorage', undefined);
			setSearch('?simulate_infra_failure=offline');

			expect(captureThrown('profile').threw).toBeTruthy();
		});
	});

	// The safety property the whole harness rests on.
	describe('environment gating', () => {
		it('should never simulate on a production build, even when opted in', () => {
			mockEnv.LOCAL = false;
			mockEnv.STAGING = false;
			setSearch('?simulate_infra_failure=offline');

			expect(captureThrown('profile').threw).toBeFalsy();
			expect(captureThrown('rewards').threw).toBeFalsy();
		});

		it('should simulate on a staging build', () => {
			mockEnv.LOCAL = false;
			mockEnv.STAGING = true;
			setSearch('?simulate_infra_failure=offline');

			expect(captureThrown('profile').threw).toBeTruthy();
		});
	});

	describe('target', () => {
		it('should default to the profile, leaving the reward loads alone', () => {
			setSearch('?simulate_infra_failure=offline');

			expect(captureThrown('profile').threw).toBeTruthy();
			expect(captureThrown('rewards').threw).toBeFalsy();
		});

		it('should break only the reward loads when targeted at them', () => {
			setSearch('?simulate_infra_failure=offline&simulate_infra_failure_target=rewards');

			expect(captureThrown('profile').threw).toBeFalsy();
			expect(captureThrown('rewards').threw).toBeTruthy();
		});

		it('should break both when targeted at all', () => {
			setSearch('?simulate_infra_failure=offline&simulate_infra_failure_target=all');

			expect(captureThrown('profile').threw).toBeTruthy();
			expect(captureThrown('rewards').threw).toBeTruthy();
		});

		it('should fall back to the profile for an unrecognised target', () => {
			setSearch('?simulate_infra_failure=offline&simulate_infra_failure_target=nonsense');

			expect(captureThrown('profile').threw).toBeTruthy();
			expect(captureThrown('rewards').threw).toBeFalsy();
		});
	});

	// The load-bearing assertion: a mode is only useful if the error it throws is classified the
	// way the mode claims. Otherwise the harness would "prove" behaviour the real outage never
	// produces.
	describe('classification', () => {
		it.each<{ mode: SimulatedInfrastructureFailureMode; unreachable: boolean }>([
			{ mode: 'offline', unreachable: true },
			{ mode: 'gateway', unreachable: true },
			{ mode: 'rate_limit', unreachable: true },
			{ mode: 'worker', unreachable: true },
			{ mode: 'timeout', unreachable: false },
			{ mode: 'unknown', unreachable: false }
		])(
			'should throw an error that isNetworkUnreachableError reports as $unreachable for $mode',
			({ mode, unreachable }) => {
				setSearch(`?simulate_infra_failure=${mode}`);

				const { threw, err } = captureThrown('profile');

				expect(threw).toBeTruthy();
				expect(isNetworkUnreachableError(err)).toBe(unreachable);
			}
		);
	});
});
