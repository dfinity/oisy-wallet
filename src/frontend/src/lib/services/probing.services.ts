export interface ResolveGroup<T> {
	probes: Array<() => Promise<unknown>>;
	onResolve: () => T;
}

export class ResolveByProbingError extends Error {}

/**
 * Resolves a value by probing groups of asynchronous checks in escalation order.
 *
 * Each group represents a compatibility or capability probe:
 * - All probes in a group are executed in parallel.
 * - If any probe rejects, the entire group is considered incompatible and
 *   the next group is tried.
 * - If all probes resolve, the group's `onResolve` callback is executed and
 *   its return value is returned immediately.
 *
 * Probes are executed lazily: a group's probes are only invoked if all previous
 * groups have failed.
 *
 * @typeParam T - The value produced when a compatible group is resolved.
 *
 * @param groups - Ordered list of probing groups to evaluate.
 *
 * @returns The value returned by the first group's `onResolve` callback whose
 *          probes all resolve successfully.
 *
 * @throws {ResolveByProbingError}
 * Thrown when:
 * - no probing groups are provided, or
 * - all probing groups fail (i.e., at least one probe rejects in every group).
 */
export const resolveByProbing = async <T>(groups: ResolveGroup<T>[]): Promise<T> => {
	if (groups.length === 0) {
		throw new ResolveByProbingError('No probing groups provided');
	}

	const errors: unknown[] = [];

	for (const { probes, onResolve } of groups) {
		try {
			await Promise.all(probes.map((p) => p()));

			return onResolve();
		} catch (err: unknown) {
			errors.push(err);
		}
	}

	throw new ResolveByProbingError(
		`All probing groups failed: ${errors.map((e) => String(e)).join(' | ')}`
	);
};
