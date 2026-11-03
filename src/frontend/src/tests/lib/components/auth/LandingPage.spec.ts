import * as backendApi from '$lib/api/backend.api';
import mainImageDark from '$lib/assets/main-image-dark.webp';
import mainImageLight from '$lib/assets/main-image-light.webp';
import LandingPage from '$lib/components/auth/LandingPage.svelte';
import { i18n } from '$lib/stores/i18n.store';
import { themeStore } from '$lib/stores/theme.store';
import { Theme } from '$lib/types/theme';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get } from 'svelte/store';

describe('LandingPage', () => {
	it('switches artwork with the theme while reserving the same layout size', async () => {
		vi.spyOn(backendApi, 'newUserSignupsAllowed').mockResolvedValue(true);
		themeStore.select(Theme.LIGHT);
		const { getByRole } = render(LandingPage);
		const image = getByRole('img', { name: replaceOisyPlaceholders(get(i18n).auth.alt.preview) });

		expect(image).toHaveAttribute('src', mainImageLight);
		expect(image).toHaveAttribute('loading', 'eager');
		expect(image).toHaveAttribute('width', '2160');
		expect(image).toHaveAttribute('height', '1504');

		themeStore.select(Theme.DARK);
		await tick();

		expect(image).toHaveAttribute('src', mainImageDark);
		expect(image).toHaveAttribute('width', '2160');
		expect(image).toHaveAttribute('height', '1504');
	});
});
