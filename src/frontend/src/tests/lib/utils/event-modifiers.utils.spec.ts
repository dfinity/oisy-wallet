import type { OnEventParam } from '$lib/types/event-modifiers';
import { preventDefault, stopPropagation } from '$lib/utils/event-modifiers.utils';

type TestEvent = OnEventParam<MouseEvent, HTMLButtonElement>;

const createEvent = (): TestEvent => new MouseEvent('click') as TestEvent;

describe('event-modifiers.utils', () => {
	describe('stopPropagation', () => {
		it('should stop propagation before calling the callback with the event', () => {
			const event = createEvent();
			const calls: string[] = [];
			const stopPropagationSpy = vi.spyOn(event, 'stopPropagation').mockImplementation(() => {
				calls.push('stopPropagation');
			});
			const callback = vi.fn(() => {
				calls.push('callback');
			});

			stopPropagation(callback)(event);

			expect(stopPropagationSpy).toHaveBeenCalledOnce();
			expect(callback).toHaveBeenCalledExactlyOnceWith(event);
			expect(calls).toStrictEqual(['stopPropagation', 'callback']);
		});

		it('should stop propagation without a callback', () => {
			const event = createEvent();
			const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

			stopPropagation(undefined)(event);
			stopPropagation(null)(event);

			expect(stopPropagationSpy).toHaveBeenCalledTimes(2);
		});
	});

	describe('preventDefault', () => {
		it('should prevent default before calling the callback with the event', () => {
			const event = createEvent();
			const calls: string[] = [];
			const preventDefaultSpy = vi.spyOn(event, 'preventDefault').mockImplementation(() => {
				calls.push('preventDefault');
			});
			const callback = vi.fn(() => {
				calls.push('callback');
			});

			preventDefault(callback)(event);

			expect(preventDefaultSpy).toHaveBeenCalledOnce();
			expect(callback).toHaveBeenCalledExactlyOnceWith(event);
			expect(calls).toStrictEqual(['preventDefault', 'callback']);
		});

		it('should prevent default without a callback', () => {
			const event = createEvent();
			const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

			preventDefault(undefined)(event);
			preventDefault(null)(event);

			expect(preventDefaultSpy).toHaveBeenCalledTimes(2);
		});

		it('should return the callback promise', () => {
			const event = createEvent();
			const promise = Promise.resolve();
			const callback = vi.fn(() => promise);

			expect(preventDefault(callback)(event)).toBe(promise);
		});
	});
});
