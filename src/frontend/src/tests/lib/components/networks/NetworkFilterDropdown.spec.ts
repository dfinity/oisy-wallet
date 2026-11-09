import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import NetworkFilterDropdown from '$lib/components/networks/NetworkFilterDropdown.svelte';
import { NETWORK_FILTER } from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { openFilterChip } from '$tests/utils/filter-chip.test-utils';
import type { Nullish } from '@dfinity/zod-schemas';
import { render, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('NetworkFilterDropdown', () => {
	const props = {
		selectedNetwork: ETHEREUM_NETWORK,
		networks: [ETHEREUM_NETWORK, BTC_MAINNET_NETWORK],
		onSelect: vi.fn()
	};

	const getChipLogoSrc = (chip: HTMLElement): Nullish<string> =>
		chip.querySelector('img')?.getAttribute('src');

	// The logos are decorative (`role="presentation"`), so they are looked up as elements.
	const getListLogoSources = (panel: HTMLElement): (string | null)[] =>
		Array.from(panel.querySelectorAll('img')).map((img) => img.getAttribute('src'));

	it("should show each network's mark in the chip and the list", async () => {
		const { getByTestId } = render(NetworkFilterDropdown, { props });

		expect(getChipLogoSrc(getByTestId(NETWORK_FILTER))).toBe(ETHEREUM_NETWORK.icon);

		const panel = await openFilterChip(NETWORK_FILTER);

		expect(getListLogoSources(panel)).toEqual(
			expect.arrayContaining([ETHEREUM_NETWORK.icon, BTC_MAINNET_NETWORK.icon])
		);
	});

	it('should name its panel after what it filters', async () => {
		render(NetworkFilterDropdown, { props });

		await openFilterChip(NETWORK_FILTER);

		expect(screen.getByRole('dialog')).toHaveAccessibleName(get(i18n).networks.filter);
	});
});
