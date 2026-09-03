import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import type { UserOrder, UserTokenBalance } from '$declarations/oisy_trade/oisy_trade.did';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import * as oisyTradeApi from '$lib/api/oisy-trade.api';
import { OisyTradeRequestError, OisyTradeTemporaryError } from '$lib/canisters/oisy-trade.errors';
import { ZERO } from '$lib/constants/app.constants';
import { OISY_TRADE_SWAP_SETTLE_GRACE_OBSERVATIONS } from '$lib/constants/oisy-trade.constants';
import * as activeUserTransactionsServices from '$lib/services/active-user-transactions.services';
import {
	pollOisyTradeActiveUserTransactions,
	resetOisyTradeSettleObservations
} from '$lib/services/oisy-trade-active-tx.services';
import { OISY_TRADE_EXTERNAL_REF_KEYS } from '$lib/types/oisy-trade-swap';
import * as consoleUtils from '$lib/utils/console.utils';
import { toOisyTradeExternalRefs } from '$lib/utils/oisy-trade-active-tx.utils';
import {
	mockActiveUserTransaction,
	mockNearIntentsActiveUserTransaction
} from '$tests/mocks/active-user-transactions.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { isNullish } from '@dfinity/utils';
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
	createdAtNs = ZERO
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

		const pollTimes = async ({
			count,
			transactions
		}: {
			count: number;
			transactions: ActiveUserTransaction[];
		}) => {
			for (let i = 0; i < count; i++) {
				await poll(transactions);
			}
		};

		// The wait before the poller may touch a row at all is measured in its own ticks
		// rather than in elapsed wall time, so a test that wants the budget spent has to
		// spend it. It applies to *every* row, order id or not: settlement is the wizard's,
		// and an order id says the order exists, never that the session that placed it has
		// stopped settling it.
		const pollPastBudget = (transactions: ActiveUserTransaction[]) =>
			pollTimes({ count: OISY_TRADE_SWAP_SETTLE_GRACE_OBSERVATIONS, transactions });

		beforeEach(() => {
			vi.restoreAllMocks();
			resetOisyTradeSettleObservations();

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

			await pollPastBudget([
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

		// Every amount this poller withdraws is a delta from the baselines, so an
		// unreadable one is left strictly alone for the same reason as an unresolvable
		// token. Substituting zero is the destructive guess: it credits the order with the
		// caller's entire free balance, so settlement would withdraw a balance the user
		// parked from the Trading tab, and — on the path where status is inferred from the
		// deltas — let a held destination balance make a killed order read as filled.
		//
		// Both baselines are written in the call that creates the row, so a row missing or
		// mangling one is malformed rather than early.
		it.each([
			{ label: 'a missing baseline', [OISY_TRADE_EXTERNAL_REF_KEYS.BASELINE_SOURCE_FREE]: '' },
			{
				label: 'a malformed baseline',
				[OISY_TRADE_EXTERNAL_REF_KEYS.BASELINE_DEST_FREE]: 'garbage'
			},
			{ label: 'a negative baseline', [OISY_TRADE_EXTERNAL_REF_KEYS.BASELINE_SOURCE_FREE]: '-1' }
		])('leaves a row with $label alone, without withdrawing anything', async (override) => {
			const consoleErrorSpy = vi
				.spyOn(consoleUtils, 'consoleError')
				.mockImplementation(() => undefined);

			// The balance a naive zero baseline would have attributed to this order and paid
			// out — the user's own, parked from the Trading tab.
			getBalancesSpy.mockResolvedValue([
				balance({ ledger: ICP_TOKEN.ledgerCanisterId, free: 500_000_000n }),
				balance({ ledger: CKUSDC_LEDGER, free: 9_000_000n })
			]);

			await pollPastBudget([row({ refs: { ...PLACED, ...override } })]);

			expect(getMyOrdersSpy).not.toHaveBeenCalled();
			expect(withdrawSpy).not.toHaveBeenCalled();
			expect(applySpy).not.toHaveBeenCalled();
			expect(deleteSpy).not.toHaveBeenCalled();
			expect(consoleErrorSpy).toHaveBeenCalled();
		});

		describe('a row with a placed order', () => {
			// The rule the whole poller hangs off: settlement is the wizard's, so a row
			// written to within the tick budget may still have a live session settling it,
			// and this must not touch it — not even to read.
			//
			// An order id is not permission. Both callers withdraw from the same
			// account-wide free balance and neither sees the other's in-flight calls, so
			// the loser of that race gets `InsufficientBalance` — which is *not* retryable
			// — and terminalizes the row `Failed` for a swap the wizard is about to report
			// as a success. `advanceStatus` then makes that verdict permanent. Gating only
			// the order-less case, as an earlier cut did, raced the foreground on every
			// single swap.
			it('leaves a row with an order id inside the tick budget to the foreground', async () => {
				await pollTimes({
					count: OISY_TRADE_SWAP_SETTLE_GRACE_OBSERVATIONS - 1,
					transactions: [row({ refs: PLACED })]
				});

				expect(getMyOrdersSpy).not.toHaveBeenCalled();
				expect(getBalancesSpy).not.toHaveBeenCalled();
				expect(withdrawSpy).not.toHaveBeenCalled();
				expect(applySpy).not.toHaveBeenCalled();
				expect(deleteSpy).not.toHaveBeenCalled();
			});

			it('withdraws the destination and succeeds on a filled order', async () => {
				getMyOrdersSpy.mockResolvedValue(order({ Filled: null }));
				getBalancesSpy.mockResolvedValue([balance({ ledger: CKUSDC_LEDGER, free: 2_000_000n })]);

				await pollPastBudget([row({ refs: PLACED })]);

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

					await pollPastBudget([row({ refs: PLACED })]);

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

					await pollPastBudget([row({ refs: PLACED })]);

					expect(withdrawSpy).not.toHaveBeenCalled();
					expect(applySpy).not.toHaveBeenCalled();
				}
			);

			// The canister no longer knows the order and neither leg holds anything
			// attributable, so an earlier attempt already paid the withdrawal out and only
			// the terminal write was lost. Nothing says which way it went, so the row closes
			// as a failure pointing at the Trading tab rather than claiming a success.
			it('closes a vanished order that left nothing behind', async () => {
				await pollPastBudget([row({ refs: PLACED })]);

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

			// The order resolved, but a non-dust leg of it is still at the venue because
			// withdrawing it was refused definitively. Succeeding the row on the order's
			// outcome alone would drop it from the pending set and tell the user the swap
			// worked with their funds still in DEX custody. It stays non-terminal so the
			// next tick retries, which is idempotent: settlement re-derives from the
			// baseline, so the withdrawn primary reads as dust and only the residue is
			// attempted.
			it('leaves the row non-terminal while a leg is still stranded at the venue', async () => {
				const consoleErrorSpy = vi
					.spyOn(consoleUtils, 'consoleError')
					.mockImplementation(() => undefined);

				getMyOrdersSpy.mockResolvedValue(order({ Filled: null }));
				// A filled Buy that crossed below its limit: the destination is credited and
				// the unspent source reserve is released alongside it.
				getBalancesSpy.mockResolvedValue([
					balance({ ledger: CKUSDC_LEDGER, free: 2_000_000n }),
					balance({ ledger: ICP_TOKEN.ledgerCanisterId, free: 300_000_000n })
				]);
				const residueError = new OisyTradeRequestError({
					message: 'ledger blew up',
					reason: 'InternalError'
				});
				withdrawSpy.mockResolvedValueOnce({ block_index: 42n }).mockRejectedValueOnce(residueError);

				await pollPastBudget([row({ refs: PLACED })]);

				// The primary landed, so the destination did reach the wallet.
				expect(withdrawSpy).toHaveBeenCalledTimes(2);
				expect(deleteSpy).not.toHaveBeenCalled();
				expect(consoleErrorSpy).toHaveBeenCalledWith(residueError);
				// The row is written — the stranded residue goes on the record — but never
				// given a status, so it stays in the poll set and keeps trying.
				expect(
					applySpy.mock.calls.every(([{ update }]: [{ update?: { status?: unknown } }]) =>
						isNullish(update?.status)
					)
				).toBeTruthy();
			});

			// …and never closes, however many times the refusal repeats. A permanently
			// unwithdrawable residue is the case that tempts a bound — a ledger fee that
			// rose above the cached `token.fee` earns `AmountTooSmall` on every attempt for
			// good — and closing the row there is the one thing that must not happen:
			// terminal rows leave the poll set, so recovery would stop, and `Succeeded`
			// would tell the user a swap completed cleanly with their funds at the venue.
			// The row keeps polling instead. It is the only thing working for them until a
			// surface for the stranded amount exists.
			it('never closes a row whose residue is refused indefinitely', async () => {
				vi.spyOn(consoleUtils, 'consoleError').mockImplementation(() => undefined);

				getMyOrdersSpy.mockResolvedValue(order({ Filled: null }));
				getBalancesSpy.mockResolvedValue([
					balance({ ledger: CKUSDC_LEDGER, free: 2_000_000n }),
					balance({ ledger: ICP_TOKEN.ledgerCanisterId, free: 300_000_000n })
				]);
				// The destination pays out on every attempt; the released source reserve never
				// does.
				withdrawSpy.mockImplementation(
					({ request }: { request: { token_id: { ledger_id: Principal } } }) =>
						request.token_id.ledger_id.toText() === CKUSDC_LEDGER
							? Promise.resolve({ block_index: 42n })
							: Promise.reject(
									new OisyTradeRequestError({ message: 'too small', reason: 'AmountTooSmall' })
								)
				);

				await pollPastBudget([row({ refs: PLACED })]);

				// The write upserts the row into the store, so every later tick sees the
				// record already on it — which is what stops the record being re-written.
				const stranded = row({
					refs: {
						...PLACED,
						[OISY_TRADE_EXTERNAL_REF_KEYS.RESIDUE_STRANDED]: 'true',
						[OISY_TRADE_EXTERNAL_REF_KEYS.WITHDRAW_BLOCK_INDEX]: '42'
					},
					createdAtNs: 1n
				});

				// Long enough to spend the budget several times over.
				await pollTimes({
					count: OISY_TRADE_SWAP_SETTLE_GRACE_OBSERVATIONS * 3,
					transactions: [stranded]
				});

				expect(deleteSpy).not.toHaveBeenCalled();
				// The one write is the record, not a closure: refs only, no status.
				expect(applySpy).toHaveBeenCalledOnce();
				expect(applySpy.mock.calls[0][0].update.status).toBeUndefined();
				expect(applySpy.mock.calls[0][0].update.externalRefs).toEqual(
					expect.arrayContaining([
						{ key: OISY_TRADE_EXTERNAL_REF_KEYS.RESIDUE_STRANDED, value: 'true' },
						// The primary's block index, which went unrecorded on this path before.
						{ key: OISY_TRADE_EXTERNAL_REF_KEYS.WITHDRAW_BLOCK_INDEX, value: '42' }
					])
				);
			});

			// Retrying every tick for the life of the tab buys nothing against a refusal
			// that may never clear, so each stranded attempt makes the row re-earn the whole
			// observation budget: indefinite retries, minutes apart rather than seconds.
			it('backs the stranded retry off to one attempt per budget', async () => {
				vi.spyOn(consoleUtils, 'consoleError').mockImplementation(() => undefined);

				getMyOrdersSpy.mockResolvedValue(order({ Filled: null }));
				getBalancesSpy.mockResolvedValue([
					balance({ ledger: CKUSDC_LEDGER, free: 2_000_000n }),
					balance({ ledger: ICP_TOKEN.ledgerCanisterId, free: 300_000_000n })
				]);
				withdrawSpy.mockImplementation(
					({ request }: { request: { token_id: { ledger_id: Principal } } }) =>
						request.token_id.ledger_id.toText() === CKUSDC_LEDGER
							? Promise.resolve({ block_index: 42n })
							: Promise.reject(
									new OisyTradeRequestError({ message: 'too small', reason: 'AmountTooSmall' })
								)
				);

				await pollTimes({
					count: OISY_TRADE_SWAP_SETTLE_GRACE_OBSERVATIONS * 3,
					transactions: [row({ refs: PLACED })]
				});

				// Three budgets, three attempts — not one per tick.
				expect(getMyOrdersSpy).toHaveBeenCalledTimes(3);
			});

			// Dust is not owed — `withdraw` refuses an amount at or below the ledger fee —
			// so a settlement whose residue leg held only dust is complete and closes.
			it('succeeds the row when the only leg left behind was dust', async () => {
				getMyOrdersSpy.mockResolvedValue(order({ Filled: null }));
				getBalancesSpy.mockResolvedValue([
					balance({ ledger: CKUSDC_LEDGER, free: 2_000_000n }),
					balance({ ledger: ICP_TOKEN.ledgerCanisterId, free: 1_000n })
				]);

				await pollPastBudget([row({ refs: PLACED })]);

				expect(withdrawSpy).toHaveBeenCalledOnce();
				expect(applySpy).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						update: expect.objectContaining({ status: { Succeeded: null } })
					})
				);
			});

			// The single most damaging bug this integration can ship: terminalizing on a
			// transient failure stops the poller with the funds still in DEX custody.
			it('leaves the row untouched on a retryable failure', async () => {
				getMyOrdersSpy.mockRejectedValue(
					new OisyTradeTemporaryError({ message: 'busy', reason: 'OperationInProgress' })
				);

				await pollPastBudget([row({ refs: PLACED })]);

				expect(applySpy).not.toHaveBeenCalled();
				expect(deleteSpy).not.toHaveBeenCalled();
			});

			// Only a definitive refusal ends the operation, and it records the canister's
			// `reason` — the machine discriminant — rather than its `message`, which is raw
			// unlocalized text of unbounded shape and would land in the failure analytics as
			// an unbounded dimension.
			it('fails the row with the canister’s reason on a non-retryable failure', async () => {
				getMyOrdersSpy.mockRejectedValue(
					new OisyTradeRequestError({ message: 'nope', reason: 'InsufficientBalance' })
				);

				await pollPastBudget([row({ refs: PLACED })]);

				expect(applySpy).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						update: expect.objectContaining({
							status: { Failed: null },
							error: 'InsufficientBalance'
						})
					})
				);
			});
		});

		describe('a row with no order id', () => {
			const DEPOSITED = { [OISY_TRADE_EXTERNAL_REF_KEYS.DEPOSIT_BLOCK_INDEX]: '7' };

			// The same budget as the placed-order case above, at the signature every healthy
			// swap passes through between the row's creation and `add_limit_order`
			// returning — where a tick landing inside it would delete the recovery record
			// mid-deposit, or withdraw the deposit out from under a placement about to
			// reserve it.
			//
			// Measured in ticks, never in elapsed wall time. The row's timestamps come from
			// the backend canister's clock and `Date.now()` from the browser's, so
			// subtracting one from the other would make this window depend on the difference
			// between them — a device five minutes fast would have no window at all. Hence
			// the deliberately absurd `created_at_ns` of zero throughout this file: an epoch
			// timestamp would read as ancient on any wall-clock comparison, so these tests
			// fail loudly if one is ever reintroduced.
			it('leaves an order-less row inside the tick budget to the foreground', async () => {
				await pollTimes({
					count: OISY_TRADE_SWAP_SETTLE_GRACE_OBSERVATIONS - 1,
					transactions: [
						row({ refs: DEPOSITED }),
						{ ...row({ status: { Pending: null } }), id: 'row-2' }
					]
				});

				expect(getBalancesSpy).not.toHaveBeenCalled();
				expect(withdrawSpy).not.toHaveBeenCalled();
				expect(applySpy).not.toHaveBeenCalled();
				expect(deleteSpy).not.toHaveBeenCalled();
			});

			// The budget is a per-step allowance, not one shared across the whole flow. Each
			// foreground milestone bumps `updated_at_ns`, which restarts the count, so a slow
			// approve cannot spend the deposit's budget and a slow deposit cannot spend
			// placement's. Without the reset, three calls that are each individually fine
			// exhaust the budget between them and the poller acts on a live flow — deleting
			// the recovery record, or withdrawing a deposit out from under a placement.
			it('restarts the budget whenever the foreground writes to the row', async () => {
				const beforeDeposit = row({ status: { Pending: null } });

				// One tick short of acting, then the foreground records its deposit.
				await pollTimes({
					count: OISY_TRADE_SWAP_SETTLE_GRACE_OBSERVATIONS - 1,
					transactions: [beforeDeposit]
				});

				const afterDeposit = {
					...row({ refs: DEPOSITED }),
					updated_at_ns: beforeDeposit.updated_at_ns + 1n
				};

				// The tick that would have spent the budget instead starts a fresh one, so it
				// counts as the first of a whole new allowance rather than the last of the old.
				await poll([afterDeposit]);

				expect(getBalancesSpy).not.toHaveBeenCalled();
				expect(withdrawSpy).not.toHaveBeenCalled();
				expect(applySpy).not.toHaveBeenCalled();
				expect(deleteSpy).not.toHaveBeenCalled();

				// Take the fresh allowance to one tick short, counting from the write rather
				// than from the row's creation.
				await pollTimes({
					count: OISY_TRADE_SWAP_SETTLE_GRACE_OBSERVATIONS - 2,
					transactions: [afterDeposit]
				});

				expect(applySpy).not.toHaveBeenCalled();

				await poll([afterDeposit]);

				expect(applySpy).toHaveBeenCalledOnce();
			});

			// Nothing happened, so there is nothing to report — and a `Failed` row would
			// invite the user to worry about funds that never left their wallet.
			it('deletes an abandoned row that never reached the canister', async () => {
				await pollPastBudget([row({ status: { Pending: null } })]);

				expect(deleteSpy).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'row-1' }));
				expect(applySpy).not.toHaveBeenCalled();
			});

			// Resolves exactly like a kill — the source comes back — but names the reason
			// the absence of an order id says it is.
			it('recovers a deposit whose order was never placed', async () => {
				getBalancesSpy.mockResolvedValue([
					balance({ ledger: ICP_TOKEN.ledgerCanisterId, free: 300_000_000n })
				]);

				await pollPastBudget([row({ refs: DEPOSITED })]);

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
			// Past the budget, nothing attributable on either leg means the funds are already
			// out of DEX custody: an earlier attempt's withdrawal landed and its reply or its
			// terminal write was lost, or the user swept the balance from the Trading tab.
			//
			// The reading this no longer fears is a live order hiding the funds behind its
			// reserve. The order is fill-or-kill, decided in the matching round after it is
			// accepted, so by the time the budget is spent it has filled — a destination
			// delta — or been killed — a source one. Zero on both cannot be an order in
			// flight. Leaving the row alone here is what used to strand it non-terminal
			// forever: undismissable, still polling, and never firing its analytics.
			it.each([{ Executing: null }, { Pending: null }])(
				'closes a %s deposit that left nothing behind',
				async (status) => {
					await pollPastBudget([row({ refs: DEPOSITED, status })]);

					expect(withdrawSpy).not.toHaveBeenCalled();
					expect(deleteSpy).not.toHaveBeenCalled();
					// Copy that names no outcome: a fill whose withdrawal reply was lost looks
					// identical from here, so it can claim neither success nor a failed placement.
					expect(applySpy).toHaveBeenCalledExactlyOnceWith(
						expect.objectContaining({
							update: expect.objectContaining({
								status: { Failed: null },
								error: en.swap.error.oisy_trade_settlement_unresolved
							})
						})
					);
				}
			);

			// The race the tick budget exists to avoid, taken at the one ordering the budget
			// cannot rule out: the recovery withdrawal is refused because `add_limit_order`
			// reserved the deposit between the balance read and the withdraw.
			// `InsufficientBalance` is not retryable, so terminalizing here would mark the
			// row failed while the order goes on to fill into DEX custody with nothing
			// polling for it. The row has to survive so the next tick can re-derive.
			it('leaves the row alone when the recovery withdrawal was outrun by the order', async () => {
				getBalancesSpy.mockResolvedValue([
					balance({ ledger: ICP_TOKEN.ledgerCanisterId, free: 300_000_000n })
				]);
				withdrawSpy.mockRejectedValue(
					new OisyTradeRequestError({ message: 'nope', reason: 'InsufficientBalance' })
				);

				await pollPastBudget([row({ refs: DEPOSITED })]);

				expect(withdrawSpy).toHaveBeenCalled();
				expect(applySpy).not.toHaveBeenCalled();
				expect(deleteSpy).not.toHaveBeenCalled();
			});
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

			await pollPastBudget([row({ refs: PLACED }), { ...row({ refs: PLACED }), id: 'row-2' }]);

			expect(applySpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					tx: expect.objectContaining({ id: 'row-2' }),
					update: expect.objectContaining({ status: { Succeeded: null } })
				})
			);
		});
	});
});
