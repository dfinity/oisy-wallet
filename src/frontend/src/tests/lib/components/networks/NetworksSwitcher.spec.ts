import * as appNavigation from '$app/navigation';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import NetworksSwitcher from '$lib/components/networks/NetworksSwitcher.svelte';
import {
	NETWORKS_SWITCHER_DROPDOWN,
	NETWORKS_SWITCHER_SELECTOR
} from '$lib/constants/test-ids.constants';
import { BACKDROP_FADE_OUT_DURATION } from '$lib/constants/transition.constants';
import { SettingsModalType } from '$lib/enums/settings-modal-types';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

describe('NetworksSwitcher', () => {
	beforeEach(() => {
		vi.clearAllMocks();

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

	describe('selecting a network', () => {
		const rowTestId = (networkId: symbol) =>
			`${NETWORKS_SWITCHER_SELECTOR}-${networkId.description}`;

		const icpRow = rowTestId(ICP_NETWORK.id);
		const ethRow = rowTestId(ETHEREUM_NETWORK.id);

		let goto: MockInstance<typeof appNavigation.goto>;

		beforeEach(() => {
			mockPage.mock({ network: ICP_NETWORK.id.description });

			goto = vi.spyOn(appNavigation, 'goto');
		});

		it('checks the clicked network before the route changes', async () => {
			goto.mockReturnValue(new Promise(() => {}));

			const { getByTestId } = render(NetworksSwitcher, { props: { visible: true } });

			await fireEvent.click(getByTestId(ethRow));

			expect(getByTestId(ethRow)).toHaveAttribute('aria-pressed', 'true');
			expect(getByTestId(icpRow)).toHaveAttribute('aria-pressed', 'false');
			expect(goto).not.toHaveBeenCalled();

			// The navigation is delayed: let it start here rather than inside the next test.
			await waitFor(() => expect(goto).toHaveBeenCalledOnce());
		});

		// The route change runs a view transition that holds the page still while the new state
		// renders, so a panel still leaving at that point would stop mid-fade.
		describe('closing before the route changes', () => {
			beforeEach(() => {
				vi.useFakeTimers();
			});

			afterEach(() => {
				vi.useRealTimers();
			});

			it('closes the panel and waits for it to leave', async () => {
				goto.mockResolvedValue();

				const { getByTestId } = render(NetworksSwitcher, { props: { visible: true } });

				await fireEvent.click(getByTestId(ethRow));
				await vi.advanceTimersByTimeAsync(0);

				expect(getByTestId(NETWORKS_SWITCHER_DROPDOWN)).toHaveAttribute('aria-expanded', 'false');

				await vi.advanceTimersByTimeAsync(BACKDROP_FADE_OUT_DURATION - 1);

				expect(goto).not.toHaveBeenCalled();

				await vi.advanceTimersByTimeAsync(1);

				expect(goto).toHaveBeenCalledOnce();
				expect(goto.mock.calls[0]?.[0].toString()).toContain(
					`network=${ETHEREUM_NETWORK.id.description}`
				);
			});
		});

		it('keeps the clicked network checked while the navigation is pending', async () => {
			goto.mockReturnValue(new Promise(() => {}));

			const { getByTestId, queryByRole } = render(NetworksSwitcher, {
				props: { visible: true }
			});

			await fireEvent.click(getByTestId(ethRow));

			await waitFor(() => expect(goto).toHaveBeenCalledOnce());
			await waitFor(() => expect(queryByRole('dialog')).not.toBeInTheDocument());

			await fireEvent.click(getByTestId(NETWORKS_SWITCHER_DROPDOWN));

			expect(getByTestId(ethRow)).toHaveAttribute('aria-pressed', 'true');
			expect(getByTestId(icpRow)).toHaveAttribute('aria-pressed', 'false');
		});

		it('checks the network of the route again when the switch fails', async () => {
			goto.mockRejectedValue(new Error('navigation failed'));

			const { getByTestId, queryByRole } = render(NetworksSwitcher, {
				props: { visible: true }
			});

			await fireEvent.click(getByTestId(ethRow));

			await waitFor(() => expect(goto).toHaveBeenCalledOnce());
			await waitFor(() => expect(queryByRole('dialog')).not.toBeInTheDocument());

			await fireEvent.click(getByTestId(NETWORKS_SWITCHER_DROPDOWN));

			await waitFor(() => expect(getByTestId(icpRow)).toHaveAttribute('aria-pressed', 'true'));

			expect(getByTestId(ethRow)).toHaveAttribute('aria-pressed', 'false');
		});
	});
});
