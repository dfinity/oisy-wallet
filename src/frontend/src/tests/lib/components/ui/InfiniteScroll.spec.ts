import InfiniteScroll from '$lib/components/ui/InfiniteScroll.svelte';
import { mockSnippet, mockSnippetTestId } from '$tests/mocks/snippet.mock';
import { assertNonNullish } from '@dfinity/utils';
import { cleanup, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';

interface IntersectionObserverEntryParams {
	isIntersecting: boolean;
	target: Element;
}

const createIntersectionObserverEntry = ({
	isIntersecting,
	target
}: IntersectionObserverEntryParams): IntersectionObserverEntry => {
	const rect = target.getBoundingClientRect();

	return {
		boundingClientRect: rect,
		intersectionRatio: isIntersecting ? 1 : 0,
		intersectionRect: rect,
		isIntersecting,
		rootBounds: null,
		target,
		time: 0
	};
};

class ControlledIntersectionObserver implements IntersectionObserver {
	public static instances: ControlledIntersectionObserver[] = [];

	public readonly root: Element | Document | null = null;
	public readonly rootMargin: string = '';
	public readonly thresholds: ReadonlyArray<number> = [];
	public readonly takeRecords: () => IntersectionObserverEntry[] = () => [];

	private observedTarget: Element | undefined;

	constructor(
		private readonly callback: IntersectionObserverCallback,
		public readonly options?: IntersectionObserverInit
	) {
		ControlledIntersectionObserver.instances.push(this);
	}

	public readonly observe = vi.fn((target: Element) => {
		this.observedTarget = target;
	});

	public readonly unobserve = vi.fn((_target: Element) => undefined);

	public readonly disconnect = vi.fn(() => undefined);

	public trigger(entries: Array<{ isIntersecting: boolean; target?: Element }>) {
		const observerEntries = entries.map(({ isIntersecting, target }) => {
			const entryTarget = target ?? this.observedTarget;
			assertNonNullish(entryTarget);

			return createIntersectionObserverEntry({ isIntersecting, target: entryTarget });
		});

		this.callback(observerEntries, this);
	}
}

const getObserver = (): ControlledIntersectionObserver => {
	const [observer] = ControlledIntersectionObserver.instances;
	assertNonNullish(observer);

	return observer;
};

describe('InfiniteScroll', () => {
	beforeEach(() => {
		ControlledIntersectionObserver.instances = [];

		vi.stubGlobal('IntersectionObserver', ControlledIntersectionObserver);
	});

	afterEach(() => {
		cleanup();

		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	it('should render children and observe the intersection target', async () => {
		const options = { rootMargin: '100px', threshold: 0.5 };

		const { container } = render(InfiniteScroll, {
			onIntersect: vi.fn(),
			testId: 'infinite-scroll',
			options,
			children: mockSnippet
		});

		expect(container.querySelector(`[data-tid="${mockSnippetTestId}"]`)).toBeInTheDocument();
		expect(container.querySelector('[data-tid="infinite-scroll"]')).toBeInTheDocument();

		const observer = getObserver();

		expect(observer.options).toStrictEqual(options);

		await waitFor(() => expect(observer.observe).toHaveBeenCalledOnce());
	});

	it('should not observe the intersection target when disabled', async () => {
		render(InfiniteScroll, {
			onIntersect: vi.fn(),
			disabled: true,
			children: mockSnippet
		});

		await tick();

		expect(getObserver().observe).not.toHaveBeenCalled();
	});

	it('should call onIntersect only when an observed entry intersects', async () => {
		const onIntersect = vi.fn<() => Promise<void>>(() => Promise.resolve());

		render(InfiniteScroll, {
			onIntersect,
			children: mockSnippet
		});

		const observer = getObserver();

		await waitFor(() => expect(observer.observe).toHaveBeenCalledOnce());

		observer.trigger([{ isIntersecting: false }]);

		expect(onIntersect).not.toHaveBeenCalled();

		observer.trigger([{ isIntersecting: false }, { isIntersecting: true }]);

		await waitFor(() => expect(onIntersect).toHaveBeenCalledOnce());
	});
});
