import { dAppDescriptions } from '$env/dapp-descriptions.env';
import { LANGUAGES } from '$env/i18n';
import LandingConnect from '$lib/components/auth/LandingConnect.svelte';
import { LANDING_NETWORKS } from '$lib/constants/landing.constants';
import { currentCurrency } from '$lib/derived/currency.derived';
import { Currency } from '$lib/enums/currency';
import { Languages } from '$lib/enums/languages';
import { i18n, loadLanguage } from '$lib/stores/i18n.store';
import { fireEvent, render, within } from '@testing-library/svelte';
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

	it('previews hovered or focused currencies and keeps selection local', async () => {
		const { getByRole } = render(LandingConnect);
		const preview = within(getByRole('group', { name: get(i18n).auth.landing.connect_preview }));
		const balance = preview.getByRole('status');
		const walletCurrency = get(currentCurrency);

		await fireEvent.click(preview.getByRole('radio', { name: 'USD' }));

		const initialBalance = balance.textContent;
		const euro = preview.getByRole('radio', { name: 'EUR' });
		const euroLabel = euro.closest('label') as HTMLLabelElement;

		await fireEvent.pointerEnter(euroLabel);

		expect(balance).toHaveTextContent('€');
		expect(euro).not.toBeChecked();

		await fireEvent.pointerLeave(euroLabel);

		expect(balance.textContent).toBe(initialBalance);

		await fireEvent.focus(euro);

		expect(balance).toHaveTextContent('€');
		expect(euro).not.toBeChecked();

		await fireEvent.blur(euro);

		expect(balance.textContent).toBe(initialBalance);

		await fireEvent.click(euro);

		expect(euro).toBeChecked();
		expect(balance).toHaveTextContent('€');
		expect(get(currentCurrency)).toBe(walletCurrency);
	});

	it('uses the currency’s preview language and falls back to the page language', async () => {
		const { getByRole } = render(LandingConnect);
		const pageLanguage = get(i18n);
		const preview = within(getByRole('group', { name: pageLanguage.auth.landing.connect_preview }));
		const rouble = preview.getByRole('radio', { name: 'RUB' });
		const balance = preview.getByRole('status');
		const russian = await loadLanguage(Languages.RUSSIAN);

		await fireEvent.click(rouble);

		await expect(
			preview.findByText(russian.hero.text.available_balance)
		).resolves.toBeInTheDocument();
		expect(preview.getByText(LANGUAGES[Languages.RUSSIAN])).toBeInTheDocument();
		expect(balance).toHaveTextContent('₽');
		expect(rouble).toBeChecked();

		await fireEvent.click(preview.getByRole('radio', { name: 'AED' }));

		expect(preview.getByText(pageLanguage.hero.text.available_balance)).toBeInTheDocument();
		expect(get(i18n).lang).toBe(pageLanguage.lang);
	});
});
