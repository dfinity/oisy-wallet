import ActiveUserTransactionItem from '$lib/components/active-user-transactions/ActiveUserTransactionItem.svelte';
import en from '$lib/i18n/en.json';
import {
	mockChainFusionActiveUserTransaction,
	mockLiquidiumActiveUserTransaction,
	mockNearIntentsActiveUserTransaction,
	mockVeloraActiveUserTransaction
} from '$tests/mocks/active-user-transactions.mock';
import { fireEvent, render, screen } from '@testing-library/svelte';

describe('ActiveUserTransactionItem', () => {
	it('renders NEAR Intents rows as a swap with amount, tokens, networks and provider', () => {
		const { container } = render(ActiveUserTransactionItem, {
			props: {
				tx: mockNearIntentsActiveUserTransaction,
				isUnseen: false,
				dismissing: false,
				onDismiss: vi.fn()
			}
		});

		expect(screen.getByText(`${en.swap.text.swap} 1 USDC → USDC`)).toBeInTheDocument();
		expect(container).toHaveTextContent('Ethereum → Solana');
		expect(container).toHaveTextContent('NEAR Intents');
	});

	it('renders Velora rows as a swap with the provider, collapsing a same-chain network line', () => {
		const { container } = render(ActiveUserTransactionItem, {
			props: {
				tx: mockVeloraActiveUserTransaction,
				isUnseen: false,
				dismissing: false,
				onDismiss: vi.fn()
			}
		});

		expect(screen.getByText(`${en.swap.text.swap} 1 USDC → USDT`)).toBeInTheDocument();
		expect(container).toHaveTextContent('Velora');
		// Source and destination share a network, so it reads once, not "Ethereum → Ethereum".
		expect(container).not.toHaveTextContent('Ethereum → Ethereum');
		expect(container).toHaveTextContent('Ethereum');
	});

	// A ck conversion joins the swap union and reuses the shared display refs, so it
	// needs no row layout of its own.
	it('renders Chain Fusion rows as a swap with the provider and the cross-chain networks', () => {
		const { container } = render(ActiveUserTransactionItem, {
			props: {
				tx: mockChainFusionActiveUserTransaction,
				isUnseen: false,
				dismissing: false,
				onDismiss: vi.fn()
			}
		});

		expect(screen.getByText(`${en.swap.text.swap} 1 ckETH → ETH`)).toBeInTheDocument();
		expect(container).toHaveTextContent('Internet Computer → Ethereum');
		expect(container).toHaveTextContent('Chain Fusion');
	});

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
