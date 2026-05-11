export const IntersectionObserverPassive = vi.fn();
IntersectionObserverPassive.mockReturnValue({
	observe: () => null,
	unobserve: () => null,
	disconnect: () => null
});

export class IntersectionObserverActive implements IntersectionObserver {
	public readonly root: Element | Document | null = null;
	public readonly rootMargin: string = '';
	public readonly thresholds: ReadonlyArray<number> = [];
	public takeRecords: () => IntersectionObserverEntry[] = () => [];

	constructor(
		private callback: (
			entries: IntersectionObserverEntry[],
			observer: IntersectionObserver
		) => void,
		private options?: IntersectionObserverInit
	) {}

	observe(element: HTMLElement) {
		this.callback(
			[
				{
					isIntersecting: true,
					target: element
				} as unknown as IntersectionObserverEntry
			],
			this
		);
	}
	disconnect = () => null;
	unobserve = () => null;
}

/**
 * Mimics the real-browser IntersectionObserver more closely than
 * `IntersectionObserverActive`: it fires the callback once per
 * `(observer instance, target)` pair (matching the spec's initial-state
 * notification) and stays silent on subsequent `observe()` calls for the same
 * target. Use this when a test needs to exercise the "sentinel stays in view"
 * path that the upstream gix-components `InfiniteScroll` cannot recover from
 * without remounting.
 */
export class IntersectionObserverOnce implements IntersectionObserver {
	public readonly root: Element | Document | null = null;
	public readonly rootMargin: string = '';
	public readonly thresholds: ReadonlyArray<number> = [];
	public takeRecords: () => IntersectionObserverEntry[] = () => [];

	private observed = new WeakSet<Element>();

	constructor(
		private callback: (
			entries: IntersectionObserverEntry[],
			observer: IntersectionObserver
		) => void,
		private options?: IntersectionObserverInit
	) {}

	observe(element: HTMLElement) {
		if (this.observed.has(element)) {
			return;
		}

		this.observed.add(element);

		this.callback(
			[
				{
					isIntersecting: true,
					target: element
				} as unknown as IntersectionObserverEntry
			],
			this
		);
	}
	disconnect = () => null;
	unobserve = () => null;
}

export const INTERSECTION_OBSERVER_ACTIVE_INTERVAL = 5000;

export class IntersectionObserverActiveInterval implements IntersectionObserver {
	public readonly root: Element | Document | null = null;
	public readonly rootMargin: string = '';
	public readonly thresholds: ReadonlyArray<number> = [];
	public takeRecords: () => IntersectionObserverEntry[] = () => [];

	constructor(
		private callback: (
			entries: IntersectionObserverEntry[],
			observer: IntersectionObserver
		) => void,
		private options?: IntersectionObserverInit
	) {}

	observe(element: HTMLElement) {
		let isIntersecting = false;

		// Immediately call once
		this.callback(
			[
				{
					isIntersecting,
					target: element
				} as unknown as IntersectionObserverEntry
			],
			this
		);

		// Start toggling every 5 seconds
		setInterval(() => {
			isIntersecting = !isIntersecting;

			this.callback(
				[
					{
						isIntersecting,
						target: element
					} as unknown as IntersectionObserverEntry
				],
				this
			);
		}, INTERSECTION_OBSERVER_ACTIVE_INTERVAL);
	}
	disconnect = () => null;
	unobserve = () => null;
}
