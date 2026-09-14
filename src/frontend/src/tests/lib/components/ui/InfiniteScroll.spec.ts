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
	// jsdom lays nothing out, so every `offsetTop` is 0. Tests move the end of the list by hand.
	let endOfListTop = 0;
	const originalOffsetTop = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop');

	beforeEach(() => {
		ControlledIntersectionObserver.instances = [];

		vi.stubGlobal('IntersectionObserver', ControlledIntersectionObserver);

		endOfListTop = 0;
		Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
			configurable: true,
			get: () => endOfListTop
		});
	});

	afterEach(() => {
		cleanup();

		vi.unstubAllGlobals();
		vi.clearAllMocks();

		if (originalOffsetTop) {
			Object.defineProperty(HTMLElement.prototype, 'offsetTop', originalOffsetTop);
		}
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

	// `observe` on a target already observed is a no-op in the browser, so re-enabling must disconnect
	// first or an intersection still under way is never reported again.
	it('should re-arm the observer from scratch when re-enabled', async () => {
		const { rerender } = render(InfiniteScroll, {
			onIntersect: vi.fn(),
			children: mockSnippet
		});

		const observer = getObserver();

		await waitFor(() => expect(observer.observe).toHaveBeenCalledOnce());

		await rerender({ disabled: true });
		await rerender({ disabled: false });

		expect(observer.observe).toHaveBeenCalledTimes(2);

		const [firstObserve, secondObserve] = observer.observe.mock.invocationCallOrder;

		expect(
			observer.disconnect.mock.invocationCallOrder.some(
				(order) => order > firstObserve && order < secondObserve
			)
		).toBeTruthy();
	});

	// On a tall window the end of the list is still on screen after one more page is revealed, and
	// the browser reports nothing new for an intersection that never ended.
	it('should re-arm after a call that grew the list', async () => {
		const onIntersect = vi.fn<() => Promise<void>>(() => {
			endOfListTop += 100;

			return Promise.resolve();
		});

		render(InfiniteScroll, { onIntersect, children: mockSnippet });

		const observer = getObserver();

		await waitFor(() => expect(observer.observe).toHaveBeenCalledOnce());

		observer.trigger([{ isIntersecting: true }]);

		await waitFor(() => expect(observer.observe).toHaveBeenCalledTimes(2));

		const [firstObserve, secondObserve] = observer.observe.mock.invocationCallOrder;

		expect(
			observer.disconnect.mock.invocationCallOrder.some(
				(order) => order > firstObserve && order < secondObserve
			)
		).toBeTruthy();
	});

	it('should not re-arm after a call that changed nothing', async () => {
		const onIntersect = vi.fn<() => Promise<void>>(() => Promise.resolve());

		render(InfiniteScroll, { onIntersect, children: mockSnippet });

		const observer = getObserver();

		await waitFor(() => expect(observer.observe).toHaveBeenCalledOnce());

		observer.trigger([{ isIntersecting: true }]);

		await waitFor(() => expect(onIntersect).toHaveBeenCalledOnce());
		await tick();

		expect(observer.observe).toHaveBeenCalledOnce();
	});

	// History loaded behind a filter leaves the displayed list as long as it was.
	it('should re-arm after a call that reported progress, even if the list did not move', async () => {
		const onIntersect = vi.fn<() => Promise<boolean>>(() => Promise.resolve(true));

		render(InfiniteScroll, { onIntersect, children: mockSnippet });

		const observer = getObserver();

		await waitFor(() => expect(observer.observe).toHaveBeenCalledOnce());

		observer.trigger([{ isIntersecting: true }]);

		await waitFor(() => expect(observer.observe).toHaveBeenCalledTimes(2));
	});

	it('should ignore intersections while a call is still running', async () => {
		let finish: (() => void) | undefined;

		const onIntersect = vi.fn<() => Promise<void>>(
			() =>
				new Promise<void>((resolve) => {
					finish = resolve;
				})
		);

		render(InfiniteScroll, { onIntersect, children: mockSnippet });

		const observer = getObserver();

		await waitFor(() => expect(observer.observe).toHaveBeenCalledOnce());

		observer.trigger([{ isIntersecting: true }]);
		observer.trigger([{ isIntersecting: true }]);

		expect(onIntersect).toHaveBeenCalledOnce();

		finish?.();
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
