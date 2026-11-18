import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import MenuAddresses from '$lib/components/core/MenuAddresses.svelte';
import { NAVIGATION_MENU_RECEIVE_BUTTON } from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import { getSymbol } from '$lib/utils/modal.utils';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('MenuAddresses', () => {
	const buttonSelector = `button[data-tid="${NAVIGATION_MENU_RECEIVE_BUTTON}"]`;

	beforeEach(() => {
		vi.restoreAllMocks();
		mockPage.reset();
	});

	it('should open Your addresses from all networks', () => {
		const openReceiveSpy = vi.spyOn(modalStore, 'openReceive');

		const { container } = render(MenuAddresses);

		const button = container.querySelector<HTMLButtonElement>(buttonSelector);

		expect(button).toHaveTextContent(get(i18n).wallet.text.your_addresses);

		button?.click();

		expect(openReceiveSpy).toHaveBeenCalledWith(getSymbol('menu-addresses'));
	});

	it.each([ICP_TOKEN, ETHEREUM_TOKEN, BTC_MAINNET_TOKEN])(
		'should offer Your addresses on the $network.name network page too',
		(token) => {
			mockPage.mockNetwork(token.network.id.description);

			const { container } = render(MenuAddresses);

			expect(container.querySelector(buttonSelector)).toHaveTextContent(
				get(i18n).wallet.text.your_addresses
			);
		}
	);
});
