import ModalExitHandler from '$lib/components/ui/ModalExitHandler.svelte';
import { modalStore } from '$lib/stores/modal.store';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

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
