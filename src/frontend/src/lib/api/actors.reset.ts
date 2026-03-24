import { clearAgents } from '$lib/actors/agents.ic';

type ResetFn = () => void;

const registry: ResetFn[] = [];

/**
 * Register a function that will be called when the identity changes
 * to reset cached canister instances.
 */
export const registerCanisterReset = (fn: ResetFn): void => {
	registry.push(fn);
};

/**
 * Clears all cached agents and canister instances.
 * Must be called whenever the authenticated identity changes
 * to prevent stale identity / signature errors.
 */
export const resetActors = (): void => {
	clearAgents();

	for (const fn of registry) {
		try {
			fn();
		} catch (_: unknown) {
			// We do not care if the reset fail, since it is purely a clean-up chore
		}
	}
};
