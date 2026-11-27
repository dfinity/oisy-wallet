import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import type * as ethBalanceServices from '$eth/services/eth-balance.services';
import { reloadEthereumBalance } from '$eth/services/eth-balance.services';
import type { Erc20Token } from '$eth/types/erc20';
import { RIFT_MAX_ORDER_READS_PER_TICK } from '$lib/constants/swap.constants';
import { getRiftOrder, isRiftRateLimited } from '$lib/rest/rift.rest';
import { applyActiveUserTransactionPollUpdate } from '$lib/services/active-user-transactions.services';
import { readEvmSourceTxOutcome } from '$lib/services/evm-source-tx.services';
import {
	pollRiftActiveUserTransactions,
	reloadRiftEvmBalances,
	resetRiftPollState
} from '$lib/services/rift-active-tx.services';
import { RiftApiError } from '$lib/types/errors';
import { RIFT_EXTERNAL_REF_KEYS, type RiftOrder } from '$lib/types/rift';
import { toRiftExternalRefsMap } from '$lib/utils/rift-active-tx.utils';
import { mockRiftActiveUserTransaction } from '$tests/mocks/active-user-transactions.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockRiftOrder } from '$tests/mocks/rift.mock';

vi.mock('$lib/rest/rift.rest', () => ({
	getRiftOrder: vi.fn(),
	isRiftRateLimited: vi.fn()
}));

vi.mock('$lib/services/active-user-transactions.services', () => ({
	applyActiveUserTransactionPollUpdate: vi.fn()
}));

vi.mock('$lib/services/evm-source-tx.services', () => ({
	readEvmSourceTxOutcome: vi.fn()
}));

vi.mock('$eth/services/eth-balance.services', async (importOriginal) => ({
	...(await importOriginal<typeof ethBalanceServices>()),
	reloadEthereumBalance: vi.fn()
}));

const orderId = mockRiftOrder.id;

const answer = (order: Partial<RiftOrder> = {}) =>
	vi.mocked(getRiftOrder).mockResolvedValue({ ...mockRiftOrder, ...order });

// A row of its own order, `n` distinguishing both.
const row = (n: number): ActiveUserTransaction => {
	const id = `${n}`.repeat(8);

	return {
		...mockRiftActiveUserTransaction,
		id: `${id}-8888-4888-8888-888888888888`,
		external_refs: mockRiftActiveUserTransaction.external_refs.map((ref) =>
			ref.key === RIFT_EXTERNAL_REF_KEYS.ORDER_ID
				? { ...ref, value: `${id}-d9cb-469f-a165-70867728950e` }
				: ref
		)
	};
};

const readOrderIds = () => vi.mocked(getRiftOrder).mock.calls.map(([{ orderId }]) => orderId);

const lastUpdate = () => vi.mocked(applyActiveUserTransactionPollUpdate).mock.lastCall?.[0].update;

describe('rift-active-tx.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetRiftPollState();
		vi.mocked(isRiftRateLimited).mockReturnValue(false);
	});

	describe('pollRiftActiveUserTransactions', () => {
		const poll = (transactions = [mockRiftActiveUserTransaction]) =>
			pollRiftActiveUserTransactions({
				identity: mockIdentity,
				transactions,
				userAddress: mockEthAddress
			});

		it('reads the order the row pays', async () => {
			answer({ status: 'awaiting_deposit' });

			await poll();

			expect(getRiftOrder).toHaveBeenCalledExactlyOnceWith({ orderId });
		});

		it('records an order still awaiting its deposit without moving the row', async () => {
			answer({ status: 'awaiting_deposit' });

			await poll();

			const update = lastUpdate();

			expect(update?.status).toBeUndefined();
			expect(toRiftExternalRefsMap(update?.externalRefs ?? [])).toMatchObject({
				rift_status: 'awaiting_deposit'
			});
		});

		it('writes nothing new once the status is recorded', async () => {
			answer({ status: 'awaiting_deposit' });

			await poll([
				{
					...mockRiftActiveUserTransaction,
					external_refs: [
						...mockRiftActiveUserTransaction.external_refs,
						{ key: RIFT_EXTERNAL_REF_KEYS.STATUS, value: 'awaiting_deposit' }
					]
				}
			]);

			expect(lastUpdate()).toEqual({});
		});

		it('moves a funded order to Executing', async () => {
			answer({ status: 'funded' });

			await poll();

			expect(lastUpdate()?.status).toEqual({ Executing: null });
		});

		it('settles a delivered order with its amount and payout in the same write', async () => {
			answer({ status: 'delivered', amount_out: '121475958', payout_tx: '0xpayout' });

			await poll();

			const update = lastUpdate();

			expect(update?.status).toEqual({ Succeeded: null });
			expect(update?.error).toBeUndefined();
			expect(toRiftExternalRefsMap(update?.externalRefs ?? [])).toMatchObject({
				rift_order_id: orderId,
				rift_status: 'delivered',
				rift_amount_out: '121.475958',
				rift_payout_tx: '0xpayout'
			});
		});

		it('fails a frozen order with its reason', async () => {
			answer({ status: 'frozen' });

			await poll();

			expect(lastUpdate()).toMatchObject({
				status: { Failed: null },
				error: en.swap.error.rift_order_frozen
			});
		});

		it('ignores an answer about another order', async () => {
			answer({ id: '0f8fad5b-d9cb-469f-a165-000000000000', status: 'delivered' });

			await poll();

			expect(applyActiveUserTransactionPollUpdate).not.toHaveBeenCalled();
		});

		it('leaves a row whose read fails, and reads the next', async () => {
			vi.mocked(getRiftOrder)
				.mockRejectedValueOnce(new RiftApiError({ status: 404, message: 'not found' }))
				.mockResolvedValueOnce({ ...mockRiftOrder, id: '22222222-d9cb-469f-a165-70867728950e' });

			await poll([row(1), row(2)]);

			expect(getRiftOrder).toHaveBeenCalledTimes(2);
			expect(applyActiveUserTransactionPollUpdate).toHaveBeenCalledOnce();
		});

		describe('a deposit from an EVM network', () => {
			const evmRow: ActiveUserTransaction = {
				...mockRiftActiveUserTransaction,
				external_refs: [
					...mockRiftActiveUserTransaction.external_refs.filter(
						({ key }) => key !== RIFT_EXTERNAL_REF_KEYS.DEPOSIT_TX
					),
					{ key: RIFT_EXTERNAL_REF_KEYS.DEPOSIT_TX, value: `0x${'ef'.repeat(32)}` },
					{ key: RIFT_EXTERNAL_REF_KEYS.DEPOSIT_NONCE, value: '7' },
					{ key: RIFT_EXTERNAL_REF_KEYS.DEPOSIT_CHAIN_ID, value: '1' }
				]
			};

			it('fails the row once the deposit reverted, while Rift waits for it', async () => {
				answer({ status: 'awaiting_deposit' });
				vi.mocked(readEvmSourceTxOutcome).mockResolvedValue('reverted');

				await poll([evmRow]);

				expect(readEvmSourceTxOutcome).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						rowId: evmRow.id,
						hash: `0x${'ef'.repeat(32)}`,
						txNonce: 7,
						userAddress: mockEthAddress
					})
				);
				expect(lastUpdate()).toMatchObject({
					status: { Failed: null },
					error: en.swap.error.failed_unexpectedly
				});
			});

			// The source chain names the cause.
			it("fails a replaced deposit as such, over Rift's expired", async () => {
				answer({ status: 'expired' });
				vi.mocked(readEvmSourceTxOutcome).mockResolvedValue('replaced');

				await poll([evmRow]);

				expect(lastUpdate()).toMatchObject({
					status: { Failed: null },
					error: en.swap.error.swap_replaced_or_dropped
				});
			});

			it("follows Rift's status while the deposit is still pending", async () => {
				answer({ status: 'expired' });
				vi.mocked(readEvmSourceTxOutcome).mockResolvedValue('pending');

				await poll([evmRow]);

				expect(lastUpdate()).toMatchObject({
					status: { Failed: null },
					error: en.swap.error.rift_deposit_expired
				});
			});

			it("follows Rift's status when the source chain cannot be read", async () => {
				answer({ status: 'expired' });
				vi.mocked(readEvmSourceTxOutcome).mockRejectedValue(new Error('rpc down'));

				await poll([evmRow]);

				expect(lastUpdate()).toMatchObject({ error: en.swap.error.rift_deposit_expired });
			});

			it('reads no source chain once Rift has seen the deposit', async () => {
				answer({ status: 'funded' });

				await poll([evmRow]);

				expect(readEvmSourceTxOutcome).not.toHaveBeenCalled();
			});

			it('reads no source chain for a BTC deposit', async () => {
				answer({ status: 'awaiting_deposit' });

				await poll();

				expect(readEvmSourceTxOutcome).not.toHaveBeenCalled();
			});
		});

		it('reads at most a few rows per round, the least recently read first', async () => {
			vi.mocked(getRiftOrder).mockRejectedValue(new Error('offline'));
			const rows = [row(1), row(2), row(3), row(4)];

			await poll(rows);

			expect(readOrderIds()).toHaveLength(RIFT_MAX_ORDER_READS_PER_TICK);

			vi.mocked(getRiftOrder).mockClear();

			await poll(rows);

			expect(readOrderIds()[0]).toBe('44444444-d9cb-469f-a165-70867728950e');
		});

		it('ends the round on a 429, and starts the next with the rows it did not reach', async () => {
			vi.mocked(getRiftOrder)
				.mockRejectedValueOnce(new Error('offline'))
				.mockRejectedValueOnce(new RiftApiError({ status: 429, message: 'slow down' }));
			const rows = [row(1), row(2), row(3)];

			await poll(rows);

			expect(readOrderIds()).toEqual([
				'11111111-d9cb-469f-a165-70867728950e',
				'22222222-d9cb-469f-a165-70867728950e'
			]);

			vi.mocked(getRiftOrder).mockClear().mockRejectedValue(new Error('offline'));

			await poll(rows);

			expect(readOrderIds()[0]).toBe('33333333-d9cb-469f-a165-70867728950e');
		});

		// The row that got the 429 counts as read, so it does not keep the others waiting.
		it('reaches every row in turn while each round ends on a 429', async () => {
			vi.mocked(getRiftOrder).mockRejectedValue(
				new RiftApiError({ status: 429, message: 'slow down' })
			);
			const rows = [row(1), row(2), row(3)];

			for (const _ of rows) {
				await poll(rows);
			}

			expect(readOrderIds()).toEqual([
				'11111111-d9cb-469f-a165-70867728950e',
				'22222222-d9cb-469f-a165-70867728950e',
				'33333333-d9cb-469f-a165-70867728950e'
			]);
		});

		// A read would wait out the rest of the Retry-After, and with it every provider's poller.
		it('reads nothing while Rift holds requests back', async () => {
			vi.mocked(isRiftRateLimited).mockReturnValue(true);

			await poll([row(1), row(2)]);

			expect(getRiftOrder).not.toHaveBeenCalled();
		});

		it('ends the round once Rift starts holding requests back', async () => {
			vi.mocked(getRiftOrder).mockImplementation(() => {
				vi.mocked(isRiftRateLimited).mockReturnValue(true);

				return Promise.reject(new Error('offline'));
			});

			await poll([row(1), row(2)]);

			expect(getRiftOrder).toHaveBeenCalledOnce();
		});
	});

	describe('reloadRiftEvmBalances', () => {
		const usdc: Erc20Token = {
			...mockValidErc20Token,
			address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
		};

		beforeEach(() => {
			vi.mocked(reloadEthereumBalance).mockResolvedValue({ success: true });
		});

		it("reloads the row's EVM token and its network's native token, each once", () => {
			reloadRiftEvmBalances({
				tx: mockRiftActiveUserTransaction,
				tokens: [ETHEREUM_TOKEN, usdc, ETHEREUM_TOKEN]
			});

			expect(reloadEthereumBalance).toHaveBeenCalledTimes(2);
			expect(reloadEthereumBalance).toHaveBeenCalledWith(ETHEREUM_TOKEN);
			expect(reloadEthereumBalance).toHaveBeenCalledWith(usdc);
		});

		it('still reloads the native token once the EVM token is disabled', () => {
			reloadRiftEvmBalances({ tx: mockRiftActiveUserTransaction, tokens: [ETHEREUM_TOKEN] });

			expect(reloadEthereumBalance).toHaveBeenCalledExactlyOnceWith(ETHEREUM_TOKEN);
		});
	});
});
