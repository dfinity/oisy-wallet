import AllTransactions from '$lib/components/transactions/AllTransactions.svelte';
import en from '$tests/mocks/i18n.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('Activity', () => {
	it('renders the title', () => {
		const { container } = render(AllTransactions);

		const title: HTMLHeadingElement | null = container.querySelector('h1');

		expect(title).not.toBeNull();
		assertNonNullish(title, 'Title not found');
		expect(title).toBeInTheDocument();
		expect(title.textContent).toBe(en.activity.text.title);
	});

	it('renders the transactions list', () => {
		const { getByText } = render(AllTransactions);

		expect(getByText(en.transactions.text.transaction_history)).toBeInTheDocument();
	});
});
