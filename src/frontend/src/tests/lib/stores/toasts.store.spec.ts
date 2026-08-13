import { toastsStore } from '$lib/stores/toasts.store';
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
});
