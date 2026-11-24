import LandingNetworks from '$lib/components/auth/LandingNetworks.svelte';
import { LANDING_NETWORKS } from '$lib/constants/landing.constants';
import { i18n } from '$lib/stores/i18n.store';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('LandingNetworks', () => {
	it('lists every network in brand order', () => {
		const { getByRole } = render(LandingNetworks);

		const list = getByRole('list', {
			name: replaceOisyPlaceholders(get(i18n).auth.landing.networks_label)
		});
		const names = [...list.querySelectorAll('li')].map(({ textContent }) => textContent?.trim());

		expect(names).toEqual(LANDING_NETWORKS.map(({ name }) => name));
		expect(names.slice(0, 3)).toEqual(['Bitcoin', 'Ethereum', 'Internet Computer']);
	});

	it('shows the reframe line', () => {
		const { getByText } = render(LandingNetworks);

		expect(getByText(get(i18n).auth.landing.reframe_end)).toBeInTheDocument();
	});
});
