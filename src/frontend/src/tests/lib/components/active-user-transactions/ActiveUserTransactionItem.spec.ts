import ActiveUserTransactionItem from '$lib/components/active-user-transactions/ActiveUserTransactionItem.svelte';
import en from '$lib/i18n/en.json';
import { mockLiquidiumActiveUserTransaction } from '$tests/mocks/active-user-transactions.mock';
import { fireEvent, render, screen } from '@testing-library/svelte';

describe('ActiveUserTransactionItem', () => {
	it('renders Liquidium rows with the action, amount, asset and provider', () => {
		render(ActiveUserTransactionItem, {
			props: {
				tx: mockLiquidiumActiveUserTransaction,
				isUnseen: false,
				dismissing: false,
				onDismiss: vi.fn()
			}
		});

		expect(screen.getByText(`${en.liquidium.text.action_supply} 1 BTC`)).toBeInTheDocument();
		expect(screen.getByText('Liquidium')).toBeInTheDocument();
		expect(screen.queryByText(/→/)).not.toBeInTheDocument();
	});

	it('calls onDismiss from a terminal Liquidium row', async () => {
		const onDismiss = vi.fn();

		render(ActiveUserTransactionItem, {
			props: {
				tx: { ...mockLiquidiumActiveUserTransaction, status: { Succeeded: null } },
				isUnseen: false,
				dismissing: false,
				onDismiss
			}
		});

		await fireEvent.click(
			screen.getByRole('button', {
				name: en.active_user_transactions.text.dismiss_aria_label
			})
		);

		expect(onDismiss).toHaveBeenCalledOnce();
	});
});
