import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { i18n } from '$lib/stores/i18n.store';
import { token } from '$lib/stores/token.store';
import XrpTransactions from '$xrp/components/transactions/XrpTransactions.svelte';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('XrpTransactions', () => {
	beforeEach(() => {
		token.set(XRP_TOKEN);
	});

	it('renders the transactions header', () => {
		const { getByText } = render(XrpTransactions);

		expect(getByText(get(i18n).transactions.text.title)).toBeInTheDocument();
	});
});
