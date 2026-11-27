import LandingNetworks from '$lib/components/auth/LandingNetworks.svelte';
import { LANDING_NETWORKS } from '$lib/constants/landing.constants';
import { i18n } from '$lib/stores/i18n.store';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.hoisted(() => vi.stubEnv('VITE_ROBINHOOD_MAINNET_DISABLED', 'true'));

describe('LandingNetworks', () => {
	afterAll(() => {
		vi.unstubAllEnvs();
	});

	it('lists every network in brand order', () => {
		const { getByRole } = render(LandingNetworks);

		const list = getByRole('list', {
			name: replaceOisyPlaceholders(get(i18n).auth.landing.networks_label)
		});
		const names = [...list.querySelectorAll('li')].map(({ textContent }) => textContent?.trim());

		expect(names).toEqual(LANDING_NETWORKS.map(({ name }) => name));
		expect(names.slice(0, 5)).toEqual([
			'Bitcoin',
			'Internet Computer',
			'Ethereum',
			'XRP Ledger',
			'Solana'
		]);
	});

	it('omits a network disabled by the deployment', () => {
		const { queryByText } = render(LandingNetworks);

		expect(queryByText('Robinhood Chain')).not.toBeInTheDocument();
	});

	it('shows the reframe line', () => {
		const { getByText } = render(LandingNetworks);

		expect(getByText(get(i18n).auth.landing.reframe_end)).toBeInTheDocument();
	});
});
