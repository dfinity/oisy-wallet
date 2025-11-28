import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import StakeTransactions from '$lib/components/stake/StakeTransactions.svelte';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import type { StakingTransactionsUiWithToken } from '$lib/types/transaction-ui';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';

const makeTx = (id: string, network = ICP_NETWORK): any => ({
	id,
	token: { symbol: 'X', network, decimals: 8 },
	timestamp: BigInt(Date.now()) * 1_000_000n, // ensure valid sort order
	from: [],
	incoming: false,
	isReward: false,
	type: 'send'
});

const renderTxs = (txs: StakingTransactionsUiWithToken[]) =>
	render(StakeTransactions, {
		props: { transactions: txs }
	});

describe('StakeTransactions', () => {
	beforeEach(() => {
		modalStore.close();
	});

	it('renders nothing when list empty', () => {
		renderTxs([]);
		expect(screen.queryByText(/Activity/i)).not.toBeInTheDocument();
	});

	it('renders title when transactions exist', () => {
		renderTxs([makeTx('t1')]);
		expect(screen.getByText(/Activity/i)).toBeInTheDocument();
	});

	it('shows max 5 until expanded', () => {
		const txs = Array.from({ length: 8 }, (_, i) => makeTx(`tx${i}`));
		renderTxs(txs);

		expect(screen.getAllByTestId('stake-tx')).toHaveLength(5);
		expect(screen.getByRole('button')).toBeInTheDocument();
	});

	it('expands to full history when button clicked', async () => {
		const txs = Array.from({ length: 7 }, (_, i) => makeTx(`t${i}`));
		renderTxs(txs);

		await fireEvent.click(screen.getByRole('button'));

		expect(screen.getAllByTestId('stake-tx')).toHaveLength(7);
		expect(screen.getByText(get(i18n).stake.text.recent_history)).toBeInTheDocument();
	});

	it('short list does not show expand button', () => {
		renderTxs(Array.from({ length: 3 }, (_, i) => makeTx(`x${i}`)));
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('sorts newest first by timestamp', () => {
		const older = makeTx('old');
		older.timestamp -= 5000n;

		const newer = makeTx('new');
		newer.timestamp += 5000n;

		renderTxs([older, newer]);

		const orderedIds = screen.getAllByTestId('stake-tx').map((el) => el.getAttribute('data-id'));
		expect(orderedIds[0]).toBe('new');
	});

	it('opens ICP modal when clicking ICP transaction', async () => {
		const tx = makeTx('icpTx', ICP_NETWORK);
		renderTxs([tx]);

		await fireEvent.click(screen.getByTestId('stake-tx'));

		expect(get(modalStore)).toMatchObject({
			kind: 'ic-transaction'
		});
	});

	it('opens Ethereum modal when clicking ETH transaction', async () => {
		const tx = makeTx('ethTx', ETHEREUM_NETWORK);
		renderTxs([tx]);

		await fireEvent.click(screen.getByTestId('stake-tx'));

		const modal = get(modalStore);
		expect(modal?.type === 'eth-transaction').toBeTruthy();
	});

	it('opens Bitcoin modal when clicking BTC transaction', async () => {
		const tx = makeTx('btcTx', BTC_MAINNET_NETWORK);
		renderTxs([tx]);

		await fireEvent.click(screen.getByTestId('stake-tx'));

		expect(get(modalStore)?.type).toBe('btc-transaction');
	});

	it('opens Solana modal when clicking SOL transaction', async () => {
		const tx = makeTx('solTx', SOLANA_MAINNET_NETWORK);
		renderTxs([tx]);

		await fireEvent.click(screen.getByTestId('stake-tx'));

		expect(get(modalStore)?.type).toBe('sol-transaction');
	});
});
