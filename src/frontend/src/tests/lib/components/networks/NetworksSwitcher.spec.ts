import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import NetworksSwitcher from '$lib/components/networks/NetworksSwitcher.svelte';
import { SettingsModalType } from '$lib/enums/settings-modal-types';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('NetworksSwitcher', () => {
	beforeEach(() => {
		mockPage.reset();
	});

	// The name is the text the trigger shows, so voice control reaches it by that text (WCAG
	// 2.5.3). The logo is hidden from it: its alt would put "<network> logo" before the name.
	it('is named by the network it shows and described by its purpose', () => {
		const { getByRole } = render(NetworksSwitcher, { props: { visible: false } });

		const trigger = getByRole('button', { name: get(i18n).networks.chain_fusion });

		expect(trigger).not.toHaveAttribute('aria-label');
		expect(trigger).toHaveAccessibleDescription(get(i18n).networks.title);
	});

	it('is named by the selected network', () => {
		mockPage.mock({ network: ICP_NETWORK.id.description });

		const { getByRole } = render(NetworksSwitcher, { props: { visible: false } });

		expect(getByRole('button', { name: ICP_NETWORK.name })).toHaveAccessibleDescription(
			get(i18n).networks.title
		);
	});

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
