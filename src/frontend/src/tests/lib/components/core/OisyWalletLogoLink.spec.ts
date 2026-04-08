import OisyWalletLogoLink from '$lib/components/core/OisyWalletLogoLink.svelte';
import { AppPath } from '$lib/constants/routes.constants';
import { NAVIGATION_ITEM_HOMEPAGE } from '$lib/constants/test-ids.constants';
import { tokenListStore } from '$lib/stores/token-list.store';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('OisyWalletLogoLink', () => {
	beforeEach(() => {
		tokenListStore.set({ filter: '' });
	});

	it('should render a link to the home page', () => {
		const { getByTestId } = render(OisyWalletLogoLink);

		const link = getByTestId(NAVIGATION_ITEM_HOMEPAGE);

		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute('href', AppPath.Tokens);
	});

	it('should clear the token list filter on click', async () => {
		const { getByTestId } = render(OisyWalletLogoLink);

		tokenListStore.set({ filter: 'bitcoin' });

		expect(get(tokenListStore).filter).toBe('bitcoin');

		await fireEvent.click(getByTestId(NAVIGATION_ITEM_HOMEPAGE));

		expect(get(tokenListStore).filter).toBe('');
	});
});
