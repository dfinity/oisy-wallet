import { modalStore } from '$lib/stores/modal.store';
import { get } from 'svelte/store';
import ModalExitHandler from '$lib/components/ui/ModalExitHandler.svelte';
import { render } from '@testing-library/svelte';

describe('ModalExitHandler', () => {
	it('closes modal on popstate event', () => {
		render(ModalExitHandler);

		const id = Symbol('modalId');
		modalStore.openIcpReceive(id);

		expect(get(modalStore)).toEqual({ type: 'icp-receive', id });

		window.dispatchEvent(new PopStateEvent('popstate'));

		expect(get(modalStore)).toBeNull();
	});
});