import ActiveUserTransactionsButton from '$lib/components/active-user-transactions/ActiveUserTransactionsButton.svelte';
import en from '$lib/i18n/en.json';
import * as activeUserTransactionsServices from '$lib/services/active-user-transactions.services';
import { activeUserTransactionsStore } from '$lib/stores/active-user-transactions.store';
import { mockActiveUserTransaction } from '$tests/mocks/active-user-transactions.mock';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { render, screen, waitFor } from '@testing-library/svelte';

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

	// On close, not open, so the dots stay visible while the user reads.
	describe('when the list closes', () => {
		beforeEach(() => {
			mockAuthStore();
			activeUserTransactionsStore.init(mockIdentity.getPrincipal());
			activeUserTransactionsStore.upsert({ transaction: pendingTx });
		});

		it('marks the rows seen for the signed-in user', async () => {
			const markSeen = vi
				.spyOn(activeUserTransactionsServices, 'markActiveUserTransactionsSeen')
				.mockResolvedValue();

			const { rerender } = render(ActiveUserTransactionsButton, { props: { visible: true } });

			expect(markSeen).not.toHaveBeenCalled();

			await rerender({ visible: false });

			expect(markSeen).toHaveBeenCalledExactlyOnceWith({ identity: mockIdentity });
		});

		it('logs a failed mark rather than leaving it unhandled', async () => {
			const err = new Error('mark failed');
			vi.spyOn(activeUserTransactionsServices, 'markActiveUserTransactionsSeen').mockRejectedValue(
				err
			);
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const { rerender } = render(ActiveUserTransactionsButton, { props: { visible: true } });
			await rerender({ visible: false });

			await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled());
		});
	});
});
