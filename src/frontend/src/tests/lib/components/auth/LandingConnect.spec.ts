import { dAppDescriptions } from '$env/dapp-descriptions.env';
import LandingConnect from '$lib/components/auth/LandingConnect.svelte';
import { LANDING_NETWORKS } from '$lib/constants/landing.constants';
import { Currency } from '$lib/enums/currency';
import { Languages } from '$lib/enums/languages';
import { i18n } from '$lib/stores/i18n.store';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('LandingConnect', () => {
	it('counts its facts from the data the wallet ships with', () => {
		const { getByText } = render(LandingConnect);
		const { landing } = get(i18n).auth;

		const valueOf = (label: string) => getByText(label).nextElementSibling?.textContent?.trim();

		expect(valueOf(landing.connect_networks)).toBe(`${LANDING_NETWORKS.length}`);
		expect(valueOf(landing.connect_apps)).toBe(`${dAppDescriptions.length}`);
		expect(valueOf(landing.connect_languages)).toBe(`${Object.values(Languages).length}`);
		expect(valueOf(landing.connect_currencies)).toBe(`${Object.values(Currency).length}`);
	});
});
