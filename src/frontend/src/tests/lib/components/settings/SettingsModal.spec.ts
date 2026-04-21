import SettingsModal from '$lib/components/settings/SettingsModal.svelte';
import {
	ADD_CUSTOM_NETWORK_MODAL,
	SETTINGS_NETWORKS_MODAL
} from '$lib/constants/test-ids.constants';
import { SettingsModalType } from '$lib/enums/settings-modal-types';
import { modalStore } from '$lib/stores/modal.store';
import { render } from '@testing-library/svelte';

describe('SettingsModal', () => {
	const modalId = Symbol('test-settings-modal');

	beforeEach(() => {
		modalStore.close();
	});

	afterAll(() => {
		modalStore.close();
	});

	it('routes ENABLED_NETWORKS through the shared Modal wrapper', () => {
		modalStore.openSettings({ id: modalId, data: SettingsModalType.ENABLED_NETWORKS });

		const { getByTestId, queryByTestId } = render(SettingsModal);

		expect(getByTestId(SETTINGS_NETWORKS_MODAL)).toBeInTheDocument();
		expect(queryByTestId(ADD_CUSTOM_NETWORK_MODAL)).toBeNull();
	});

	it('routes ADD_CUSTOM_NETWORK to the AddCustomNetworkModal (outside the shared Modal wrapper)', () => {
		// AddCustomNetworkModal brings its own WizardModal — rendering it inside
		// the shared `<Modal>` would double-wrap. The discriminator must bypass
		// that wrapper for this type.
		modalStore.openSettings({ id: modalId, data: SettingsModalType.ADD_CUSTOM_NETWORK });

		const { getByTestId, queryByTestId } = render(SettingsModal);

		expect(getByTestId(ADD_CUSTOM_NETWORK_MODAL)).toBeInTheDocument();
		expect(queryByTestId(SETTINGS_NETWORKS_MODAL)).toBeNull();
	});
});
