import ActiveUserTransactionItem from '$lib/components/active-user-transactions/ActiveUserTransactionItem.svelte';
import { NANO_SECONDS_IN_MILLISECOND, NANO_SECONDS_IN_SECOND } from '$lib/constants/app.constants';
import en from '$lib/i18n/en.json';
import { formatNanosecondsToShortRelativeTime } from '$lib/utils/format.utils';
import {
	mockChainFusionActiveUserTransaction,
	mockLiquidiumActiveUserTransaction,
	mockNearIntentsActiveUserTransaction,
	mockOisyTradeActiveUserTransaction,
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

	// A fifth swap provider renders through the shared layout for free, because its
	// display refs speak OneSec's exact key strings — and its provider entry is
	// unconditional, so a row outliving a flag rollback keeps its name.
	it('renders OISY Trade rows as a swap with the provider, collapsing the same-network line', () => {
		const { container } = render(ActiveUserTransactionItem, {
			props: {
				tx: mockOisyTradeActiveUserTransaction,
				isUnseen: false,
				dismissing: false,
				onDismiss: vi.fn()
			}
		});

		expect(screen.getByText(`${en.swap.text.swap} 3 ICP → ckUSDC`)).toBeInTheDocument();
		expect(container).toHaveTextContent('OISY Trade');
		expect(container).not.toHaveTextContent('Internet Computer → Internet Computer');
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

	describe('relative time', () => {
		const now = new Date(2026, 0, 1, 12);
		const nowNs = BigInt(now.getTime()) * NANO_SECONDS_IN_MILLISECOND;
		const threeHoursAgoNs = nowNs - 3n * 60n * 60n * NANO_SECONDS_IN_SECOND;
		const oneMinuteAgoNs = nowNs - 60n * NANO_SECONDS_IN_SECOND;

		const relativeTime = (nanoseconds: bigint): string =>
			formatNanosecondsToShortRelativeTime({ nanoseconds, currentDate: now });

		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(now);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('shows the time since the terminal status change, not since creation', () => {
			const { container } = render(ActiveUserTransactionItem, {
				props: {
					tx: {
						...mockNearIntentsActiveUserTransaction,
						status: { Succeeded: null },
						created_at_ns: threeHoursAgoNs,
						updated_at_ns: oneMinuteAgoNs
					},
					isUnseen: false,
					dismissing: false,
					onDismiss: vi.fn()
				}
			});

			expect(container).toHaveTextContent(relativeTime(oneMinuteAgoNs));
			expect(container).not.toHaveTextContent(relativeTime(threeHoursAgoNs));
		});

		it('shows the time since creation while the transaction is still running', () => {
			const { container } = render(ActiveUserTransactionItem, {
				props: {
					tx: {
						...mockNearIntentsActiveUserTransaction,
						status: { Executing: null },
						created_at_ns: threeHoursAgoNs,
						updated_at_ns: oneMinuteAgoNs
					},
					isUnseen: false,
					dismissing: false,
					onDismiss: vi.fn()
				}
			});

			expect(container).toHaveTextContent(relativeTime(threeHoursAgoNs));
			expect(container).not.toHaveTextContent(relativeTime(oneMinuteAgoNs));
		});
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
