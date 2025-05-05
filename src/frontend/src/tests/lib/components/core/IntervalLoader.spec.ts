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
		const load = vi.fn();

		render(IntervalLoader, {
			props: {
				load,
				interval
			}
		});

		await tick();

		expect(load).toHaveBeenCalledOnce();
	});

	it('should call load function repeatedly on interval', async () => {
		const load = vi.fn();
		const interval = 1000;

		render(IntervalLoader, {
			props: {
				load,
				interval
			}
		});

		await tick();

		expect(load).toHaveBeenCalledOnce();

		const n = 5;

		vi.advanceTimersByTime(interval * 5 + interval / 2);

		expect(load).toHaveBeenCalledTimes(n + 1);
	});

	it('should stop timer on destroy', async () => {
		const load = vi.fn();

		const { unmount } = render(IntervalLoader, {
			props: {
				load,
				interval
			}
		});

		await tick();

		expect(load).toHaveBeenCalledOnce();

		unmount();

		vi.advanceTimersByTime(interval * 5);

		expect(load).toHaveBeenCalledOnce();
	});
});
