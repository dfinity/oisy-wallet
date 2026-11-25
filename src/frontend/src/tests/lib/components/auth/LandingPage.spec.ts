import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import * as backendApi from '$lib/api/backend.api';
import LandingPage from '$lib/components/auth/LandingPage.svelte';
import { LANDING_SECTION_IDS } from '$lib/constants/landing.constants';
import { i18n } from '$lib/stores/i18n.store';
import { themeStore } from '$lib/stores/theme.store';
import { Theme } from '$lib/types/theme';
import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
import { render, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get } from 'svelte/store';

describe('LandingPage', () => {
	it('shows the hero promise and loads the feature sections below it', async () => {
		vi.spyOn(backendApi, 'newUserSignupsAllowed').mockResolvedValue(true);
		const { getByRole, findByRole } = render(LandingPage);
		const { address_book, auth, notes } = get(i18n);
		const { landing, text } = auth;
		const heading = getByRole('heading', { level: 1 });

		// Signed out, this page replaces SplitPane, so it must carry the main landmark itself.
		expect(within(getByRole('main')).getByRole('heading', { level: 1 })).toBe(heading);
		expect(heading).toHaveTextContent(replaceOisyPlaceholders(text.title_part_1));
		expect(heading).toHaveTextContent(text.title_part_2);

		for (const title of [
			landing.hold_title,
			landing.swap_title,
			landing.give_title,
			landing.borrow_title,
			landing.security_title,
			landing.connect_title,
			landing.close_title
		]) {
			// The sections are a lazy chunk that pulls in token and swap-provider data; a cold load can
			// take longer than findBy's default second.
			await expect(
				findByRole('heading', { level: 2, name: title }, { timeout: 5000 })
			).resolves.toBeInTheDocument();
		}

		for (const title of [
			notes.text.title,
			address_book.text.title,
			landing.tip_title,
			landing.security_first_send_title
		]) {
			expect(getByRole('heading', { level: 3, name: title })).toBeInTheDocument();
		}
	});

	it('uses the colored network logos in the swap preview', async () => {
		vi.spyOn(backendApi, 'newUserSignupsAllowed').mockResolvedValue(true);
		const { findByRole } = render(LandingPage);
		const { auth, core } = get(i18n);
		const swapSection = await findByRole(
			'region',
			{ name: auth.landing.swap_title },
			{ timeout: 5000 }
		);

		for (const network of [BTC_MAINNET_NETWORK, ETHEREUM_NETWORK]) {
			// By alt text: the preview is one labelled image, so its logos have no role of their own.
			const logos = within(swapSection).getAllByAltText(
				replacePlaceholders(core.alt.logo, { $name: network.name })
			);

			logos.forEach((logo) => expect(logo).toHaveAttribute('src', network.iconColored));
		}
	});

	it('moves focus to the section a fragment link names once the sections load', async () => {
		vi.spyOn(backendApi, 'newUserSignupsAllowed').mockResolvedValue(true);
		const scrollIntoView = vi.fn();
		Element.prototype.scrollIntoView = scrollIntoView;
		window.location.hash = `#${LANDING_SECTION_IDS.swap}`;

		const { findByRole } = render(LandingPage);
		const section = await findByRole('region', { name: get(i18n).auth.landing.swap_title });

		await vi.waitFor(() => expect(section).toHaveFocus());

		expect(section).toHaveAttribute('id', LANDING_SECTION_IDS.swap);
		expect(scrollIntoView).toHaveBeenCalledOnce();

		window.location.hash = '';
		Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
	});

	it('keeps the same accessible vector preview and intrinsic size across theme changes', async () => {
		vi.spyOn(backendApi, 'newUserSignupsAllowed').mockResolvedValue(true);
		themeStore.select(Theme.LIGHT);
		const { findByRole, getByRole } = render(LandingPage);
		const image = await findByRole('img', {
			name: replaceOisyPlaceholders(get(i18n).auth.alt.preview)
		});

		expect(image).toHaveAttribute('viewBox', '0 0 1080 752');
		expect(image).toHaveAttribute('width', '2160');
		expect(image).toHaveAttribute('height', '1504');

		themeStore.select(Theme.DARK);
		await tick();

		expect(getByRole('img', { name: replaceOisyPlaceholders(get(i18n).auth.alt.preview) })).toBe(
			image
		);
	});
});
