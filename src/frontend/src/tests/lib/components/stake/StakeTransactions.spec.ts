import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import StakeTransactions from '$lib/components/stake/StakeTransactions.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import type { Network } from '$lib/types/network';
import type { StakingTransactionsUiWithToken } from '$lib/types/transaction-ui';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';

const makeTx = ({
	id,
	network = ICP_NETWORK
}: {
	id: string;
	network?: Network;
}): StakingTransactionsUiWithToken =>
	({
		id,
		token: { ...ICP_TOKEN, network },
		timestamp: BigInt(Date.now()) * 1_000_000n,
		from: '0xabc',
		to: '0xdef',
		incoming: false,
		isReward: false,
		type: 'send',
		status: 'confirmed',
		value: 10000000000n
	}) as unknown as StakingTransactionsUiWithToken;

const renderTxs = (txs: StakingTransactionsUiWithToken[]) =>
	render(StakeTransactions, {
		props: {
			transactions: txs,
			testId: 'stake-tx'
		}
	});

describe('StakeTransactions', () => {
	beforeEach(() => {
		modalStore.close();
	});

	it('renders nothing when list empty', () => {
		renderTxs([]);

		expect(screen.queryByText(get(i18n).navigation.text.activity)).not.toBeInTheDocument();
	});

	it('renders title when transactions exist', () => {
		renderTxs([makeTx({ id: 't1' })]);

		expect(screen.getByText(get(i18n).navigation.text.activity)).toBeInTheDocument();
	});

	it('shows max 5 until expanded', () => {
		const txs = Array.from({ length: 8 }, (_, i) => makeTx({ id: `tx${i}` }));
		renderTxs(txs);

		expect(screen.getAllByTestId(/stake-tx-transaction/)).toHaveLength(5);
		expect(screen.getByTestId('stake-tx-expand-transactions-button')).toBeInTheDocument();
	});

	it('expands to full history when button clicked', async () => {
		const txs = Array.from({ length: 7 }, (_, i) => makeTx({ id: `t${i}` }));
		renderTxs(txs);

		await fireEvent.click(screen.getByTestId('stake-tx-expand-transactions-button'));

		expect(screen.getAllByTestId(/stake-tx-transaction/)).toHaveLength(7);
		expect(screen.getByText(get(i18n).stake.text.recent_history)).toBeInTheDocument();
	});

	it('no expand button for ≤ 5 items', () => {
		renderTxs(Array.from({ length: 3 }, (_, i) => makeTx({ id: `x${i}` })));

		expect(screen.queryByTestId('stake-tx-expand-transactions-button')).not.toBeInTheDocument();
	});

	it('sorts by timestamp newest first', () => {
		const older = {
			...makeTx({ id: 'old' }),
			timestamp: ZERO,
			value: 10000000000n
		} as unknown as StakingTransactionsUiWithToken;
		const newer = {
			...makeTx({ id: 'new' }),
			timestamp: 5_000_000n,
			value: 50000000000n
		} as unknown as StakingTransactionsUiWithToken;

		renderTxs([older, newer]);

		const cards = screen.getAllByTestId(/stake-tx-transaction/);

		expect(cards).toHaveLength(2);

		const [first, second] = cards;

		expect(first.textContent ?? '').toContain('500');
		expect(second.textContent ?? '').toContain('100');
	});

	it('opens ICP modal', async () => {
		const tx = makeTx({ id: 'icpTx', network: ICP_NETWORK });
		renderTxs([tx]);

		await fireEvent.click(screen.getByTestId('stake-tx-transaction-0'));

		expect(get(modalStore)?.type).toBe('ic-transaction');
	});

	it('opens ETH modal', async () => {
		const tx = makeTx({ id: 'ethTx', network: ETHEREUM_NETWORK });
		renderTxs([tx]);

		await fireEvent.click(screen.getByTestId('stake-tx-transaction-0'));

		expect(get(modalStore)?.type).toBe('eth-transaction');
	});

	it('opens BTC modal', async () => {
		const tx = makeTx({ id: 'btcTx', network: BTC_MAINNET_NETWORK });
		renderTxs([tx]);

		await fireEvent.click(screen.getByTestId('stake-tx-transaction-0'));

		expect(get(modalStore)?.type).toBe('btc-transaction');
	});

	it('opens SOL modal', async () => {
		const tx = makeTx({ id: 'solTx', network: SOLANA_MAINNET_NETWORK });
		renderTxs([tx]);

		await fireEvent.click(screen.getByTestId('stake-tx-transaction-0'));

		expect(get(modalStore)?.type).toBe('sol-transaction');
	});
});
