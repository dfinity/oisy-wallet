import { toastsNetworkUnreachableOr, toastsStore } from '$lib/stores/toasts.store';
import en from '$tests/mocks/i18n.mock';
import { HttpFetchErrorCode, TransportError } from '@dfinity/agent';
import { get } from 'svelte/store';

describe('toasts.store', () => {
	beforeEach(() => {
		toastsStore.reset();
	});

	it('shows a toast and returns its id', () => {
		const id = toastsStore.show({ level: 'success', text: 'hi' });

		const msgs = get(toastsStore);

		expect(msgs).toHaveLength(1);
		expect(msgs[0].id).toBe(id);
		expect(msgs[0].text).toBe('hi');
	});

	it('reuses a provided id', () => {
		const id = Symbol('custom');

		const returned = toastsStore.show({ id, level: 'info', text: 'hi' });

		expect(returned).toBe(id);
		expect(get(toastsStore)[0].id).toBe(id);
	});

	it('hides a toast by id', () => {
		const id = toastsStore.show({ level: 'success', text: 'a' });
		toastsStore.show({ level: 'success', text: 'b' });

		toastsStore.hide(id);

		const msgs = get(toastsStore);

		expect(msgs).toHaveLength(1);
		expect(msgs[0].text).toBe('b');
	});

	it('updates a toast content while preserving order', () => {
		const id = toastsStore.show({ level: 'info', text: 'first' });
		toastsStore.show({ level: 'info', text: 'second' });

		toastsStore.update({ id, content: { text: 'updated' } });

		const msgs = get(toastsStore);

		expect(msgs[0].text).toBe('updated');
		expect(msgs[1].text).toBe('second');
	});

	it('leaves other toasts unchanged when updating a missing id', () => {
		toastsStore.show({ level: 'info', text: 'keep' });

		toastsStore.update({ id: Symbol('missing'), content: { text: 'x' } });

		expect(get(toastsStore)[0].text).toBe('keep');
	});

	it('resets only the given levels', () => {
		toastsStore.show({ level: 'success', text: 't' });
		toastsStore.show({ level: 'warn', text: 't' });
		toastsStore.show({ level: 'error', text: 't' });
		toastsStore.show({ level: 'info', text: 't' });

		toastsStore.reset(['error', 'warn']);

		expect(get(toastsStore)).toHaveLength(2);
	});

	it('resets all toasts when no levels are given', () => {
		toastsStore.show({ level: 'success', text: 't' });
		toastsStore.show({ level: 'error', text: 't' });

		toastsStore.reset();

		expect(get(toastsStore)).toHaveLength(0);
	});

	it('resets all toasts when an empty level list is given', () => {
		toastsStore.show({ level: 'success', text: 't' });

		toastsStore.reset([]);

		expect(get(toastsStore)).toHaveLength(0);
	});

	describe('toastsNetworkUnreachableOr', () => {
		const networkError = () =>
			TransportError.fromCode(new HttpFetchErrorCode(new TypeError('Load failed')));

		beforeEach(() => {
			vi.spyOn(console, 'error').mockImplementation(() => {});
		});

		it('shows the short connection message and skips the fallback', () => {
			const fallback = vi.fn();

			toastsNetworkUnreachableOr({ err: networkError(), fallback });

			expect(fallback).not.toHaveBeenCalled();
			expect(get(toastsStore)[0].text).toBe(en.init.error.network_unreachable);
		});

		// The whole point: agent-js's developer text must not ride along on the message.
		it('does not append the raw agent-js detail', () => {
			toastsNetworkUnreachableOr({ err: networkError(), fallback: vi.fn() });

			expect(get(toastsStore)[0].text).not.toContain('Failed to fetch HTTP request');
			expect(get(toastsStore)[0].text).not.toContain('Load failed');
		});

		it('defers to the fallback for any other error', () => {
			const fallback = vi.fn();

			toastsNetworkUnreachableOr({ err: new Error('Boom'), fallback });

			expect(fallback).toHaveBeenCalledOnce();
			expect(get(toastsStore)).toHaveLength(0);
		});

		it('logs the error even though it is kept out of the message', () => {
			const consoleErrorSpy = vi.spyOn(console, 'error');
			const err = networkError();

			toastsNetworkUnreachableOr({ err, fallback: vi.fn() });

			expect(consoleErrorSpy).toHaveBeenCalledWith(err);
		});
	});
});
