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
 * Fires the callback once per `(observer instance, target)` pair, then stays
 * silent. Matches the spec's initial-state notification.
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

	unobserve(element: Element) {
		this.observed.delete(element);
	}

	disconnect() {
		this.observed = new WeakSet<Element>();
	}
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

/**
 * Reports the end of the list once on `observe`, as a browser does for the initial state, and again
 * only when a test calls `enterView`, as a browser does once the user scrolls it back into view. A
 * disconnected observer hears nothing, so a list that disables its scroll stops being asked.
 */
export class IntersectionObserverManual implements IntersectionObserver {
	private static observers = new Set<IntersectionObserverManual>();

	public readonly root: Element | Document | null = null;
	public readonly rootMargin: string = '';
	public readonly thresholds: ReadonlyArray<number> = [];
	public takeRecords: () => IntersectionObserverEntry[] = () => [];

	private targets = new Set<Element>();

	constructor(private callback: IntersectionObserverCallback) {}

	static enterView = () =>
		IntersectionObserverManual.observers.forEach((observer) =>
			observer.report([...observer.targets])
		);

	observe(element: Element) {
		IntersectionObserverManual.observers.add(this);

		this.targets.add(element);

		this.report([element]);
	}

	unobserve(element: Element) {
		this.targets.delete(element);
	}

	disconnect() {
		this.targets.clear();

		IntersectionObserverManual.observers.delete(this);
	}

	private report(targets: Element[]) {
		if (targets.length === 0) {
			return;
		}

		this.callback(
			targets.map(
				(target) => ({ isIntersecting: true, target }) as unknown as IntersectionObserverEntry
			),
			this
		);
	}
}
