import ActiveUserTransactionsButton from '$lib/components/active-user-transactions/ActiveUserTransactionsButton.svelte';
import en from '$lib/i18n/en.json';
import { activeUserTransactionsStore } from '$lib/stores/active-user-transactions.store';
import { mockActiveUserTransaction } from '$tests/mocks/active-user-transactions.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { render, screen } from '@testing-library/svelte';

const pendingTx = {
	...mockActiveUserTransaction,
	status: { Pending: null } as const
};

describe('ActiveUserTransactionsButton', () => {
	beforeEach(() => {
		activeUserTransactionsStore.reset();
		localStorage.clear();
	});

	it('hides the button when there are no transactions', () => {
		render(ActiveUserTransactionsButton);

		expect(
			screen.queryByLabelText(en.active_user_transactions.text.open_aria_label)
		).not.toBeInTheDocument();
	});

	it('renders the button when transactions exist', () => {
		activeUserTransactionsStore.init(mockIdentity.getPrincipal());
		activeUserTransactionsStore.upsert({ transaction: pendingTx });

		render(ActiveUserTransactionsButton);

		expect(
			screen.getByLabelText(en.active_user_transactions.text.open_aria_label)
		).toBeInTheDocument();
	});
});
