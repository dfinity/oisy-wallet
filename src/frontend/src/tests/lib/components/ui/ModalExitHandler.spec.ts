import { modalStore } from '$lib/stores/modal.store';
import { doPreNavigation } from '$lib/utils/before-navigate.utils';
import { get } from 'svelte/store';

describe('ModalExitHandler', () => {
	it('closes modal on navigation', () => {
		const id = Symbol('modalId');
		modalStore.openIcpReceive(id);

		expect(get(modalStore)).toEqual({ type: 'icp-receive', id });

		doPreNavigation({ cancel: () => {}, busy: false });

		expect(get(modalStore)).toBeNull();
	});

	it('closes busy modal on navigation', () => {
		const id = Symbol('modalId');
		modalStore.openIcpReceive(id);

		expect(get(modalStore)).toEqual({ type: 'icp-receive', id });

		const confirmMessageSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

		doPreNavigation({ cancel: () => {}, busy: true });

		expect(confirmMessageSpy).toHaveBeenCalled();
		expect(get(modalStore)).toBeNull();
	});

	it('cancels navigation while navigating away from busy modal', () => {
		const id = Symbol('modalId');
		modalStore.openIcpReceive(id);

		expect(get(modalStore)).toEqual({ type: 'icp-receive', id });

		const confirmMessageSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false);
		const cancelSpy = vi.fn();
		doPreNavigation({ cancel: cancelSpy, busy: true });

		expect(confirmMessageSpy).toHaveBeenCalled();
		expect(cancelSpy).toHaveBeenCalled();
		expect(get(modalStore)).toEqual({ type: 'icp-receive', id });
	});
});
