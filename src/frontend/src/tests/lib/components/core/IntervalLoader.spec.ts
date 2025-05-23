import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';

describe('AutoLoader', () => {
	const interval = 1000;

	beforeAll(() => {
		vi.useFakeTimers();
	});

	afterAll(() => {
		vi.useRealTimers();
	});

	it('should call load function once on mount', async () => {
		const onLoad = vi.fn();

		render(IntervalLoader, {
			props: {
				onLoad,
				interval
			}
		});

		await tick();

		expect(onLoad).toHaveBeenCalledOnce();
	});

	it('should call load function repeatedly on interval', async () => {
		const onLoad = vi.fn();
		const interval = 1000;

		render(IntervalLoader, {
			props: {
				onLoad,
				interval
			}
		});

		await tick();

		expect(onLoad).toHaveBeenCalledOnce();

		const n = 5;

		vi.advanceTimersByTime(interval * 5 + interval / 2);

		expect(onLoad).toHaveBeenCalledTimes(n + 1);
	});

	it('should stop timer on destroy', async () => {
		const onLoad = vi.fn();

		const { unmount } = render(IntervalLoader, {
			props: {
				onLoad,
				interval
			}
		});

		await tick();

		expect(onLoad).toHaveBeenCalledOnce();

		unmount();

		vi.advanceTimersByTime(interval * 5);

		expect(onLoad).toHaveBeenCalledOnce();
	});
});
