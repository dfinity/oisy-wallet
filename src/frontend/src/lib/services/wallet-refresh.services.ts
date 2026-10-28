type RefreshOwner = 'wallet' | 'evm' | 'prices';
type RefreshHandler = (signal: AbortSignal) => Promise<void>;
interface Owner {
	kind: RefreshOwner;
	refresh: RefreshHandler;
}
const owners = new Set<Owner>();
let active: { controller: AbortController; owners: Set<Owner>; promise: Promise<void> } | undefined;

export const registerWalletRefresh = ({ kind, refresh }: Owner): (() => void) => {
	const owner = { kind, refresh };
	owners.add(owner);
	return () => {
		owners.delete(owner);
		if (active?.owners.has(owner)) {
			cancelWalletRefresh();
		}
	};
};

export const cancelWalletRefresh = (): void => {
	active?.controller.abort(new DOMException('Wallet refresh cancelled', 'AbortError'));
};

// Owners retain their existing stores, token selection and polling. This operation
// only joins their work; it never replaces the document or renews authentication.
export const refreshWallet = (): Promise<void> => {
	if (active) {
		return active.promise;
	}
	const snapshot = new Set(owners);
	if (
		['wallet', 'evm', 'prices'].some((kind) => ![...snapshot].some((owner) => owner.kind === kind))
	) {
		return Promise.reject(new Error('Wallet refresh is not ready'));
	}
	const controller = new AbortController();
	const { signal } = controller;
	let rejectCancelled: (reason: unknown) => void;
	const cancelled = new Promise<never>((_, reject) => {
		rejectCancelled = reject;
	});
	const onAbort = () => rejectCancelled(signal.reason);
	signal.addEventListener('abort', onAbort, { once: true });
	const timeout = setTimeout(
		() => controller.abort(new DOMException('Wallet refresh timed out', 'TimeoutError')),
		15_000
	);
	const work = Promise.allSettled(
		[...snapshot].map(({ refresh }) =>
			Promise.resolve().then(() => {
				signal.throwIfAborted();
				return refresh(signal);
			})
		)
	).then((results) => {
		const errors = results.flatMap((result) =>
			result.status === 'rejected' ? [result.reason] : []
		);
		if (errors.length) {
			throw new AggregateError(errors, 'Wallet refresh failed');
		}
	});
	const promise = Promise.race([work, cancelled]).finally(() => {
		clearTimeout(timeout);
		signal.removeEventListener('abort', onAbort);
		// An owner can fail before its sibling worker requests complete. Dispose
		// their listeners even though the background reads themselves may finish.
		controller.abort();
		if (active?.controller === controller) {
			active = undefined;
		}
	});
	active = { controller, owners: snapshot, promise };
	return promise;
};
