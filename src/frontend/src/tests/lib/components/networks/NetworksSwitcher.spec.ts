import NetworksSwitcher from '$lib/components/networks/NetworksSwitcher.svelte';
import { SettingsModalType } from '$lib/enums/settings-modal-types';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('NetworksSwitcher', () => {
	it('opens enabled-network settings and dismisses the dropdown', async () => {
		const openSettings = vi.spyOn(modalStore, 'openSettings').mockImplementation(() => {});
		const { getByRole, queryByRole } = render(NetworksSwitcher, { props: { visible: true } });
		await fireEvent.click(getByRole('button', { name: new RegExp(get(i18n).networks.manage) }));

		expect(openSettings).toHaveBeenCalledWith({
			id: expect.any(Symbol),
			data: SettingsModalType.ENABLED_NETWORKS
		});

		await waitFor(() => expect(queryByRole('dialog')).not.toBeInTheDocument());
	});
});
