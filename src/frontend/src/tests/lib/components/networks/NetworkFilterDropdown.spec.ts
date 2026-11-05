import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import NetworkFilterDropdown from '$lib/components/networks/NetworkFilterDropdown.svelte';
import { MODAL_FILTER_NETWORKS } from '$lib/constants/test-ids.constants';
import { COLORED_NETWORK_LOGOS_CONTEXT_KEY } from '$lib/stores/colored-network-logos.store';
import { i18n } from '$lib/stores/i18n.store';
import type { Nullish } from '@dfinity/zod-schemas';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('NetworkFilterDropdown', () => {
	const props = {
		selectedNetwork: ETHEREUM_NETWORK,
		networks: [ETHEREUM_NETWORK, BTC_MAINNET_NETWORK],
		onSelect: vi.fn()
	};

	const getChipLogoSrc = (chip: HTMLElement): Nullish<string> =>
		chip.querySelector('img')?.getAttribute('src');

	const openList = async (): Promise<HTMLElement> => {
		await fireEvent.click(screen.getByTestId(`${MODAL_FILTER_NETWORKS}-trigger`));

		return await screen.findByTestId('popover-content');
	};

	// The logos are decorative (`role="presentation"`), so they are looked up as elements.
	const getListLogoSources = (panel: HTMLElement): (string | null)[] =>
		Array.from(panel.querySelectorAll('img')).map((img) => img.getAttribute('src'));

	it('should show the monochrome marks by default', async () => {
		const { getByTestId } = render(NetworkFilterDropdown, { props });

		expect(getChipLogoSrc(getByTestId(MODAL_FILTER_NETWORKS))).toBe(ETHEREUM_NETWORK.icon);

		const panel = await openList();

		expect(getListLogoSources(panel)).toEqual(
			expect.arrayContaining([ETHEREUM_NETWORK.icon, BTC_MAINNET_NETWORK.icon])
		);
	});

	const coloredScreen = new Map([[COLORED_NETWORK_LOGOS_CONTEXT_KEY, true]]);

	it('should show the coloured marks in the chip and the list on a screen that asks for them', async () => {
		const { getByTestId } = render(NetworkFilterDropdown, { props, context: coloredScreen });

		expect(getChipLogoSrc(getByTestId(MODAL_FILTER_NETWORKS))).toBe(ETHEREUM_NETWORK.iconColored);

		const panel = await openList();

		expect(getListLogoSources(panel)).toEqual(
			expect.arrayContaining([ETHEREUM_NETWORK.iconColored, BTC_MAINNET_NETWORK.iconColored])
		);
		expect(getListLogoSources(panel)).not.toContain(ETHEREUM_NETWORK.icon);
	});

	it('should show the coloured mark in a locked label', () => {
		const { getByTestId } = render(NetworkFilterDropdown, {
			props: { ...props, locked: true },
			context: coloredScreen
		});

		expect(getChipLogoSrc(getByTestId(MODAL_FILTER_NETWORKS))).toBe(ETHEREUM_NETWORK.iconColored);
	});

	it('should name its panel after what it filters', async () => {
		render(NetworkFilterDropdown, { props });

		await openList();

		expect(screen.getByRole('dialog')).toHaveAccessibleName(get(i18n).networks.filter);
	});
});
