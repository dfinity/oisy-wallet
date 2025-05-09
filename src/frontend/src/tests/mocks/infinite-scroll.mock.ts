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
