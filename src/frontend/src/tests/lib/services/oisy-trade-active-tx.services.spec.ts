import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import type { UserOrder, UserTokenBalance } from '$declarations/oisy_trade/oisy_trade.did';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import * as oisyTradeApi from '$lib/api/oisy-trade.api';
import { OisyTradeRequestError, OisyTradeTemporaryError } from '$lib/canisters/oisy-trade.errors';
import { ZERO } from '$lib/constants/app.constants';
import { OISY_TRADE_SWAP_SETTLE_GRACE_PERIOD_MILLIS } from '$lib/constants/oisy-trade.constants';
import * as activeUserTransactionsServices from '$lib/services/active-user-transactions.services';
import { pollOisyTradeActiveUserTransactions } from '$lib/services/oisy-trade-active-tx.services';
import { OISY_TRADE_EXTERNAL_REF_KEYS } from '$lib/types/oisy-trade-swap';
import * as consoleUtils from '$lib/utils/console.utils';
import { toOisyTradeExternalRefs } from '$lib/utils/oisy-trade-active-tx.utils';
import {
	mockActiveUserTransaction,
	mockNearIntentsActiveUserTransaction
} from '$tests/mocks/active-user-transactions.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@icp-sdk/core/principal';

// 6 dp, 10_000 (0.01 ckUSDC) ledger fee — the figure that decides what counts as
// permanently unwithdrawable dust.
const ckUsdcFields = vi.hoisted(() => ({
	ledgerCanisterId: 'xevnm-gaaaa-aaaar-qafnq-cai',
	symbol: 'ckUSDC',
	decimals: 6,
	fee: 10_000n
}));

// The poller resolves a row's `TokenId` legs back to the wallet's own tokens, because
// settlement needs each one's ledger fee and decimals rather than just its ledger id.
vi.mock(import('$lib/derived/all-tokens.derived'), async (importOriginal) => {
	const actual = await importOriginal();
	const { readable } = await import('svelte/store');
	const { mockValidIcToken } = await import('$tests/mocks/ic-tokens.mock');

	return {
		...actual,
		allSortedIcrcTokens: readable([
			{ ...mockValidIcToken, ...ckUsdcFields, enabled: true }
		]) as unknown as typeof actual.allSortedIcrcTokens
	};
});

const CKUSDC_LEDGER = ckUsdcFields.ledgerCanisterId;

const nowNs = (): bigint => BigInt(Date.now()) * 1_000_000n;

const beforeGraceNs = (): bigint =>
	BigInt(Date.now() - OISY_TRADE_SWAP_SETTLE_GRACE_PERIOD_MILLIS - 1_000) * 1_000_000n;

const balance = ({ ledger, free }: { ledger: string; free: bigint }) =>
	({
		token: { id: { ledger_id: Principal.fromText(ledger) } },
		balance: { free, reserved: ZERO }
	}) as unknown as UserTokenBalance;

const order = (status: object): UserOrder[] =>
	[{ id: 'order-1', order: { status }, pair: {} }] as unknown as UserOrder[];

const row = ({
	refs = {},
	status = { Executing: null },
	createdAtNs = beforeGraceNs()
}: {
	refs?: Partial<Record<string, string>>;
	status?: ActiveUserTransaction['status'];
	createdAtNs?: bigint;
} = {}): ActiveUserTransaction => ({
	...mockActiveUserTransaction,
	id: 'row-1',
	status,
	data: {
		OisyTrade: {
			side: { Sell: null },
			source_token: { Icrc: Principal.fromText(ICP_TOKEN.ledgerCanisterId) },
			dest_token: { Icrc: Principal.fromText(CKUSDC_LEDGER) },
			amount: 300_000_000n
		}
	},
	external_refs: toOisyTradeExternalRefs({
		[OISY_TRADE_EXTERNAL_REF_KEYS.BASELINE_SOURCE_FREE]: '0',
		[OISY_TRADE_EXTERNAL_REF_KEYS.BASELINE_DEST_FREE]: '0',
		...refs
	}),
	created_at_ns: createdAtNs,
	updated_at_ns: createdAtNs
});

const PLACED = {
	[OISY_TRADE_EXTERNAL_REF_KEYS.DEPOSIT_BLOCK_INDEX]: '7',
	[OISY_TRADE_EXTERNAL_REF_KEYS.ORDER_ID]: 'order-1'
};

describe('oisy-trade-active-tx.services', () => {
	describe('pollOisyTradeActiveUserTransactions', () => {
		let applySpy: ReturnType<typeof vi.spyOn>;
		let deleteSpy: ReturnType<typeof vi.spyOn>;
		let withdrawSpy: ReturnType<typeof vi.spyOn>;
		let getBalancesSpy: ReturnType<typeof vi.spyOn>;
		let getMyOrdersSpy: ReturnType<typeof vi.spyOn>;

		const poll = (transactions: ActiveUserTransaction[]) =>
			pollOisyTradeActiveUserTransactions({ identity: mockIdentity, transactions });

		beforeEach(() => {
			vi.restoreAllMocks();

			applySpy = vi
				.spyOn(activeUserTransactionsServices, 'applyActiveUserTransactionPollUpdate')
				.mockResolvedValue();
			deleteSpy = vi
				.spyOn(activeUserTransactionsServices, 'deleteActiveUserTransaction')
				.mockResolvedValue();

			getMyOrdersSpy = vi.spyOn(oisyTradeApi, 'getMyOrders').mockResolvedValue([]);
			getBalancesSpy = vi.spyOn(oisyTradeApi, 'getBalances').mockResolvedValue([]);
			withdrawSpy = vi.spyOn(oisyTradeApi, 'withdraw').mockResolvedValue({ block_index: 42n });
		});

		it('no-ops on an empty list', async () => {
			await poll([]);

			expect(getMyOrdersSpy).not.toHaveBeenCalled();
			expect(applySpy).not.toHaveBeenCalled();
		});

		it('ignores another provider’s row', async () => {
			await poll([mockNearIntentsActiveUserTransaction]);

			expect(getMyOrdersSpy).not.toHaveBeenCalled();
			expect(applySpy).not.toHaveBeenCalled();
		});

		// Settlement needs the ledger fee to tell a withdrawable balance from permanently
		// unwithdrawable dust, so a row it cannot resolve is left strictly alone rather
		// than guessed at.
		it('leaves a row whose tokens it cannot resolve alone', async () => {
			const consoleErrorSpy = vi
				.spyOn(consoleUtils, 'consoleError')
				.mockImplementation(() => undefined);

			await poll([
				{
					...row({ refs: PLACED }),
					data: {
						OisyTrade: {
							side: { Sell: null },
							source_token: { Icrc: Principal.fromText('mxzaz-hqaaa-aaaar-qaada-cai') },
							dest_token: { Icrc: Principal.fromText(CKUSDC_LEDGER) },
							amount: 1n
						}
					}
				}
			]);

			expect(getMyOrdersSpy).not.toHaveBeenCalled();
			expect(applySpy).not.toHaveBeenCalled();
			expect(consoleErrorSpy).toHaveBeenCalled();
		});

		describe('a row with a placed order', () => {
			it('withdraws the destination and succeeds on a filled order', async () => {
				getMyOrdersSpy.mockResolvedValue(order({ Filled: null }));
				getBalancesSpy.mockResolvedValue([balance({ ledger: CKUSDC_LEDGER, free: 2_000_000n })]);

				await poll([row({ refs: PLACED })]);

				expect(withdrawSpy).toHaveBeenCalledOnce();
				expect(withdrawSpy.mock.calls[0][0].request.token_id.ledger_id.toText()).toBe(
					CKUSDC_LEDGER
				);
				expect(applySpy).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						update: expect.objectContaining({ status: { Succeeded: null } })
					})
				);
				// Every block index this settlement paid out — a Buy that crossed below its
				// limit has its released reserve withdrawn alongside the fill.
				expect(applySpy.mock.calls[0][0].update.externalRefs).toEqual(
					expect.arrayContaining([
						{ key: OISY_TRADE_EXTERNAL_REF_KEYS.WITHDRAW_BLOCK_INDEX, value: '42' }
					])
				);
			});

			// A killed order is a failed swap whose funds are recovered: the source token
			// comes back and the user is out only the ledger fees.
			it.each([{ Expired: null }, { Canceled: null }])(
				'withdraws the source and fails the row on %s',
				async (status) => {
					getMyOrdersSpy.mockResolvedValue(order(status));
					getBalancesSpy.mockResolvedValue([
						balance({ ledger: ICP_TOKEN.ledgerCanisterId, free: 300_000_000n })
					]);

					await poll([row({ refs: PLACED })]);

					expect(withdrawSpy.mock.calls[0][0].request.token_id.ledger_id.toText()).toBe(
						ICP_TOKEN.ledgerCanisterId
					);
					expect(applySpy).toHaveBeenCalledExactlyOnceWith(
						expect.objectContaining({
							update: expect.objectContaining({
								status: { Failed: null },
								error: en.swap.error.oisy_trade_order_killed
							})
						})
					);
				}
			);

			// A live order's reserve is locked — "funds reserved by open orders are not
			// withdrawable until the order fills or is canceled" — so asking would only fail.
			it.each([{ Pending: null }, { Open: null }])(
				'attempts no withdrawal while the order is %s',
				async (status) => {
					getMyOrdersSpy.mockResolvedValue(order(status));

					await poll([row({ refs: PLACED })]);

					expect(withdrawSpy).not.toHaveBeenCalled();
					expect(applySpy).not.toHaveBeenCalled();
				}
			);

			// The canister no longer knows the order and neither leg holds anything
			// attributable, so an earlier attempt already paid the withdrawal out and only
			// the terminal write was lost. Nothing says which way it went, so the row closes
			// as a failure pointing at the Trading tab rather than claiming a success.
			it('closes a vanished order that left nothing behind', async () => {
				await poll([row({ refs: PLACED })]);

				expect(withdrawSpy).not.toHaveBeenCalled();
				expect(applySpy).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						update: expect.objectContaining({
							status: { Failed: null },
							error: en.swap.error.oisy_trade_settlement_unresolved
						})
					})
				);
			});

			// The single most damaging bug this integration can ship: terminalizing on a
			// transient failure stops the poller with the funds still in DEX custody.
			it('leaves the row untouched on a retryable failure', async () => {
				getMyOrdersSpy.mockRejectedValue(
					new OisyTradeTemporaryError({ message: 'busy', reason: 'OperationInProgress' })
				);

				await poll([row({ refs: PLACED })]);

				expect(applySpy).not.toHaveBeenCalled();
				expect(deleteSpy).not.toHaveBeenCalled();
			});

			// Only a definitive refusal ends the operation, and with the canister's own
			// message rather than a hand-written one.
			it('fails the row with the canister’s reason on a non-retryable failure', async () => {
				getMyOrdersSpy.mockRejectedValue(
					new OisyTradeRequestError({ message: 'nope', reason: 'InsufficientBalance' })
				);

				await poll([row({ refs: PLACED })]);

				expect(applySpy).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						update: { status: { Failed: null }, error: 'nope' }
					})
				);
			});
		});

		describe('a row with no order id', () => {
			const DEPOSITED = { [OISY_TRADE_EXTERNAL_REF_KEYS.DEPOSIT_BLOCK_INDEX]: '7' };

			// The grace period is load-bearing rather than a nicety: every healthy swap
			// passes through exactly this signature between the row's creation and
			// `add_limit_order` returning, and a tick landing inside it would withdraw the
			// deposit out from under an order placement still in flight.
			it('leaves a row younger than the grace period to the foreground', async () => {
				await poll([
					row({ refs: DEPOSITED, createdAtNs: nowNs() }),
					row({ status: { Pending: null }, createdAtNs: nowNs() })
				]);

				expect(getBalancesSpy).not.toHaveBeenCalled();
				expect(withdrawSpy).not.toHaveBeenCalled();
				expect(applySpy).not.toHaveBeenCalled();
				expect(deleteSpy).not.toHaveBeenCalled();
			});

			// Nothing happened, so there is nothing to report — and a `Failed` row would
			// invite the user to worry about funds that never left their wallet.
			it('deletes an abandoned row that never reached the canister', async () => {
				await poll([row({ status: { Pending: null } })]);

				expect(deleteSpy).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'row-1' }));
				expect(applySpy).not.toHaveBeenCalled();
			});

			// Resolves exactly like a kill — the source comes back — but names the reason
			// the absence of an order id says it is.
			it('recovers a deposit whose order was never placed', async () => {
				getBalancesSpy.mockResolvedValue([
					balance({ ledger: ICP_TOKEN.ledgerCanisterId, free: 300_000_000n })
				]);

				await poll([row({ refs: DEPOSITED })]);

				// Never polled: there is no order id to poll by.
				expect(getMyOrdersSpy).not.toHaveBeenCalled();
				expect(withdrawSpy.mock.calls[0][0].request.token_id.ledger_id.toText()).toBe(
					ICP_TOKEN.ledgerCanisterId
				);
				expect(applySpy).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						update: expect.objectContaining({
							status: { Failed: null },
							error: en.swap.error.oisy_trade_order_not_placed
						})
					})
				);
			});

			// A deposit whose order id was lost looks identical to one that is still live,
			// because a live order's reserve holds no free balance. Deleting or failing it
			// would be the one unrecoverable mistake here, so it keeps polling.
			it.each([{ Executing: null }, { Pending: null }])(
				'keeps polling a %s deposit whose order may still be live',
				async (status) => {
					await poll([row({ refs: DEPOSITED, status })]);

					expect(withdrawSpy).not.toHaveBeenCalled();
					expect(applySpy).not.toHaveBeenCalled();
					expect(deleteSpy).not.toHaveBeenCalled();
				}
			);
		});

		// Sequential rather than concurrent — the canister rejects a second withdrawal
		// while one is in flight for the same caller — so one row throwing must not stop
		// the rows behind it.
		it('settles the rows behind one that failed unexpectedly', async () => {
			vi.spyOn(consoleUtils, 'consoleError').mockImplementation(() => undefined);
			getMyOrdersSpy
				.mockRejectedValueOnce(new Error('backend down'))
				.mockResolvedValue(order({ Filled: null }));
			getBalancesSpy.mockResolvedValue([balance({ ledger: CKUSDC_LEDGER, free: 2_000_000n })]);

			await poll([row({ refs: PLACED }), { ...row({ refs: PLACED }), id: 'row-2' }]);

			expect(applySpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					tx: expect.objectContaining({ id: 'row-2' }),
					update: expect.objectContaining({ status: { Succeeded: null } })
				})
			);
		});
	});
});
