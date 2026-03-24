import { registerCanisterReset, resetActors } from '$lib/api/actors.reset';
import * as agentsIc from '$lib/actors/agents.ic';

describe('actors.reset', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe('resetActors', () => {
		it('should call clearAgents', () => {
			const spy = vi.spyOn(agentsIc, 'clearAgents');

			resetActors();

			expect(spy).toHaveBeenCalledOnce();
		});

		it('should call all registered reset functions', () => {
			const resetFn1 = vi.fn();
			const resetFn2 = vi.fn();

			registerCanisterReset(resetFn1);
			registerCanisterReset(resetFn2);

			resetActors();

			expect(resetFn1).toHaveBeenCalledOnce();
			expect(resetFn2).toHaveBeenCalledOnce();
		});

		it('should call clearAgents even if no reset functions are registered', () => {
			const spy = vi.spyOn(agentsIc, 'clearAgents');

			resetActors();

			expect(spy).toHaveBeenCalledOnce();
		});
	});

	describe('registerCanisterReset', () => {
		it('should accumulate reset functions across multiple calls', () => {
			const resetFn1 = vi.fn();
			const resetFn2 = vi.fn();
			const resetFn3 = vi.fn();

			registerCanisterReset(resetFn1);
			registerCanisterReset(resetFn2);
			registerCanisterReset(resetFn3);

			resetActors();

			expect(resetFn1).toHaveBeenCalledOnce();
			expect(resetFn2).toHaveBeenCalledOnce();
			expect(resetFn3).toHaveBeenCalledOnce();
		});
	});
});
