export interface ResolveGroup<T> {
	probes: Array<() => Promise<unknown>>;
	onResolve: () => T;
}

export class EscalationError extends Error {}

export const resolveByProbing = async <T>(groups: ResolveGroup<T>[]): Promise<T> => {
	if (groups.length === 0) {
		throw new EscalationError('No probing groups provided');
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

	throw new EscalationError(
		`All probing groups failed: ${errors.map((e) => String(e)).join(' | ')}`
	);
};
