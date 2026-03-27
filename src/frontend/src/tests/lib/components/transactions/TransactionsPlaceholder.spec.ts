import { isIcMintingAccount } from '$icp/stores/ic-minting-account.store';
import TransactionsPlaceholder from '$lib/components/transactions/TransactionsPlaceholder.svelte';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('TransactionsPlaceholder', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		isIcMintingAccount.set(false);
	});

	it('should render the icon', () => {
		const { container } = render(TransactionsPlaceholder);

		expect(container.querySelector('svg')).toBeInTheDocument();
	});

	it('should render the correct text', () => {
		const { getByText } = render(TransactionsPlaceholder);

		expect(getByText(en.transactions.text.transaction_history)).toBeInTheDocument();
		expect(getByText(en.transactions.text.buy_or_receive)).toBeInTheDocument();
	});

	it('should render the correct text when the user is the minting account', () => {
		isIcMintingAccount.set(true);

		const { getByText } = render(TransactionsPlaceholder);

		expect(getByText(en.transactions.text.minter_transaction_history)).toBeInTheDocument();
		expect(getByText(en.transactions.text.mint_burn_transactions_unavailable)).toBeInTheDocument();
	});
});
