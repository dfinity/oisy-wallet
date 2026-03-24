import type { registerCanisterReset, resetActors } from '$lib/api/actors.reset';

const mockClearAgents = vi.fn();

vi.mock('$lib/actors/agents.ic', () => ({
	clearAgents: mockClearAgents
}));

describe('actors.reset', () => {
	let registerFn: typeof registerCanisterReset;
	let resetFn: typeof resetActors;

	beforeEach(async () => {
		vi.resetModules();
		mockClearAgents.mockClear();

		const mod = await import('$lib/api/actors.reset');
		registerFn = mod.registerCanisterReset;
		resetFn = mod.resetActors;
	});

	describe('resetActors', () => {
		it('should call clearAgents', () => {
			resetFn();

			expect(mockClearAgents).toHaveBeenCalledOnce();
		});

		it('should call clearAgents when no reset functions are registered', () => {
			resetFn();

			expect(mockClearAgents).toHaveBeenCalledOnce();
		});

		it('should call all registered reset functions', () => {
			const resetFn1 = vi.fn();
			const resetFn2 = vi.fn();

			registerFn(resetFn1);
			registerFn(resetFn2);

			resetFn();

			expect(resetFn1).toHaveBeenCalledOnce();
			expect(resetFn2).toHaveBeenCalledOnce();
		});

		it('should call registered reset functions on every invocation', () => {
			const resetCallback = vi.fn();

			registerFn(resetCallback);

			resetFn();
			resetFn();

			expect(resetCallback).toHaveBeenCalledTimes(2);
			expect(mockClearAgents).toHaveBeenCalledTimes(2);
		});
	});

	describe('registerCanisterReset', () => {
		it('should accumulate reset functions across multiple registrations', () => {
			const fns = [vi.fn(), vi.fn(), vi.fn()];

			for (const fn of fns) {
				registerFn(fn);
			}

			resetFn();

			for (const fn of fns) {
				expect(fn).toHaveBeenCalledOnce();
			}
		});
	});
});
