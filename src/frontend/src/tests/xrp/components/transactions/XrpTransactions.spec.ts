import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import { token } from '$lib/stores/token.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import XrpTransactions from '$xrp/components/transactions/XrpTransactions.svelte';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('XrpTransactions', () => {
	beforeEach(() => {
		token.set(XRP_TOKEN);
		mockPage.reset();
		modalStore.close();
	});

	it('renders the transactions header', () => {
		const { getByText } = render(XrpTransactions);

		expect(getByText(get(i18n).transactions.text.title)).toBeInTheDocument();
	});

	it('renders the token details modal when it is opened', async () => {
		mockPage.mockToken(XRP_TOKEN);

		const { container } = render(XrpTransactions);

		expect(container).not.toHaveTextContent(get(i18n).tokens.details.title);

		modalStore.openXrpToken({ id: Symbol(), data: undefined });

		await waitFor(() => {
			expect(container).toHaveTextContent(get(i18n).tokens.details.title);
		});
	});
});
