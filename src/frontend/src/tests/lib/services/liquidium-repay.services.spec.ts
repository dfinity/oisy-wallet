import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { alchemyProviders } from '$eth/providers/alchemy.providers';
import { reloadEthereumBalance } from '$eth/services/eth-balance.services';
import type { EthAddress } from '$eth/types/address';
import * as liquidiumApi from '$lib/api/liquidium.api';
import { TRACK_COUNT_LIQUIDIUM_SUBMITTED } from '$lib/constants/analytics.constants';
import { ZERO } from '$lib/constants/app.constants';
import { LIQUIDIUM_REPAY_LEASE_RENEWAL_MILLIS } from '$lib/constants/liquidium.constants';
import { ProgressStepsLiquidiumRepay } from '$lib/enums/progress-steps';
import * as activeUserTransactionsServices from '$lib/services/active-user-transactions.services';
import * as analyticsServices from '$lib/services/analytics.services';
import {
	computeLiquidiumRepayPreview,
	executeLiquidiumRepay,
	getLiquidiumMaxRepayAmount,
	holdLiquidiumRepayUntilMined,
	liquidiumDebtInterestUsd,
	liquidiumPendingCoversDebt,
	liquidiumRepayCapError,
	liquidiumRepaySpendable
} from '$lib/services/liquidium-repay.services';
import * as liquidiumServices from '$lib/services/liquidium.services';
import { liquidiumUnminedRepaysStore } from '$lib/stores/liquidium-unmined-repays.store';
import type { LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import { LIQUIDIUM_EXTERNAL_REF_KEYS } from '$lib/types/liquidium-active-tx';
import type { TokenId } from '$lib/types/token';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { SupplyFlow, SupplyTarget } from '@liquidium/client';
import { get } from 'svelte/store';

vi.mock('$eth/providers/alchemy.providers', () => ({ alchemyProviders: vi.fn() }));
vi.mock('$eth/services/eth-balance.services', () => ({ reloadEthereumBalance: vi.fn() }));
vi.mock('$lib/api/liquidium.api', () => ({ liquidiumClient: vi.fn() }));
vi.mock('$lib/services/liquidium.services', () => ({ getOrCreateLiquidiumProfile: vi.fn() }));
vi.mock('$lib/services/active-user-transactions.services', () => ({
	createActiveUserTransaction: vi.fn(),
	deleteActiveUserTransaction: vi.fn(),
	updateActiveUserTransaction: vi.fn()
}));
vi.mock('$lib/services/analytics.services', () => ({ trackEvent: vi.fn() }));

describe('liquidium-repay.services', () => {
	const ethAddress = '0x1111111111111111111111111111111111111111' as EthAddress;
	const profileId = 'profile-1';
	const poolId = 'pool-btc';

	const reserve: LiquidiumReserve = {
		poolId,
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 0,
		borrowApy: 9,
		deposited: ZERO,
		depositedDecimals: 8,
		borrowed: 100_000_000n,
		borrowedDecimals: 8,
		suppliedUsd: 0,
		borrowedUsd: 1_000
	};

	const portfolio: LiquidiumPortfolio = {
		reserves: [reserve],
		totalSuppliedUsd: 4_000,
		totalBorrowedUsd: 1_000,
		netValueUsd: 3_000,
		availableBorrowsUsd: 2_000,
		weightedLiquidationThresholdBps: 8_000,
		healthFactorPercent: 75
	};

	describe('liquidiumDebtInterestUsd', () => {
		it('scales the accrued interest by the reserve price basis', () => {
			// 10% of principal in interest → 10% of borrowedUsd = 100.
			expect(liquidiumDebtInterestUsd({ ...reserve, debtInterest: 10_000_000n })).toBeCloseTo(
				100,
				5
			);
		});

		it('is zero when there is no accrued interest', () => {
			expect(liquidiumDebtInterestUsd(reserve)).toBe(0);
		});
	});

	describe('computeLiquidiumRepayPreview', () => {
		it('improves the projected health as debt is repaid', () => {
			// repayUsd 500 → remaining total debt 500; ltv 500/4000 = 0.125; health (1−0.125/0.8)×100.
			const preview = computeLiquidiumRepayPreview({ portfolio, repayUsd: 500 });

			expect(preview.projectedHealthPercent).toBeCloseTo(84.375, 3);
		});

		it('reaches 100% when the debt is fully repaid', () => {
			const preview = computeLiquidiumRepayPreview({ portfolio, repayUsd: 1_000 });

			expect(preview.projectedHealthPercent).toBe(100);
		});
	});

	describe('liquidiumPendingCoversDebt', () => {
		it('is false without pending repays', () => {
			expect(
				liquidiumPendingCoversDebt({ pendingRepay: ZERO, maxRepay: ZERO, reserve })
			).toBeFalsy();
		});

		it('is true when the net cap is zero', () => {
			expect(
				liquidiumPendingCoversDebt({ pendingRepay: 1n, maxRepay: ZERO, reserve })
			).toBeTruthy();
		});

		it('is true when pending repays reach the debt, even with a dust cap', () => {
			expect(
				liquidiumPendingCoversDebt({
					pendingRepay: 100_000_000n,
					maxRepay: 150n,
					reserve: { ...reserve, debtInterest: 500_000n }
				})
			).toBeTruthy();
		});

		it('is false while pending repays fall short of the debt', () => {
			expect(
				liquidiumPendingCoversDebt({ pendingRepay: 99_999_999n, maxRepay: 1n, reserve })
			).toBeFalsy();
		});

		it('is false while the cap is still loading and the debt is not covered', () => {
			expect(
				liquidiumPendingCoversDebt({ pendingRepay: 1n, maxRepay: undefined, reserve })
			).toBeFalsy();
		});
	});

	describe('liquidiumRepayCapError', () => {
		const cap = { maxRepay: 100n, pendingRepay: ZERO, reserve, i18n: en };

		it('is undefined within the cap', () => {
			expect(liquidiumRepayCapError({ ...cap, amount: 50n })).toBeUndefined();
		});

		it('accepts exactly the cap', () => {
			expect(liquidiumRepayCapError({ ...cap, amount: 100n })).toBeUndefined();
		});

		it('flags an amount over the cap', () => {
			expect(liquidiumRepayCapError({ ...cap, amount: 101n })?.message).toBe(
				en.liquidium.text.repay_exceeds_debt
			);
		});

		it('flags a missing cap as unavailable', () => {
			expect(liquidiumRepayCapError({ ...cap, amount: 1n, maxRepay: undefined })?.message).toBe(
				en.liquidium.text.repay_debt_unavailable
			);
		});

		it('flags a dust amount once pending repays cover the debt', () => {
			// 1 BTC pending covers the 1 BTC debt; the buffer leaves a 150-sat cap the amount fits.
			expect(
				liquidiumRepayCapError({
					...cap,
					amount: 100n,
					maxRepay: 150n,
					pendingRepay: 100_000_000n
				})?.message
			).toBe(en.liquidium.text.repay_pending_covers_debt);
		});
	});

	describe('getLiquidiumMaxRepayAmount', () => {
		const getProfileId = vi.fn();
		const getPosition = vi.fn();
		const getMaxRepayAmount = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();
			vi.mocked(liquidiumApi.liquidiumClient).mockReturnValue({
				accounts: { getProfileId },
				positions: { getPosition, getMaxRepayAmount }
			} as unknown as ReturnType<typeof liquidiumApi.liquidiumClient>);
			// What the SDK quotes for the position below: (borrowed + debtInterest) × 1.001.
			getMaxRepayAmount.mockResolvedValue({ amount: 100_600_500n, decimals: 8n });
		});

		it('returns the debt plus a 0.1% buffer, without adding the interest it already includes', async () => {
			getProfileId.mockResolvedValue(profileId);
			getPosition.mockResolvedValue({ borrowed: 100_000_000n, debtInterest: 500_000n });

			const amount = await getLiquidiumMaxRepayAmount({
				identity: mockIdentity,
				ethAddress,
				poolId
			});

			expect(amount).toBe(100_100_000n);
			expect(getPosition).toHaveBeenCalledExactlyOnceWith(profileId, poolId);
			expect(getMaxRepayAmount).toHaveBeenCalledExactlyOnceWith(profileId, poolId);
		});

		it('is capped by the SDK max repay when it quotes less', async () => {
			getProfileId.mockResolvedValue(profileId);
			getPosition.mockResolvedValue({ borrowed: 100_000_000n, debtInterest: 500_000n });
			getMaxRepayAmount.mockResolvedValue({ amount: 100_050_000n, decimals: 8n });

			await expect(
				getLiquidiumMaxRepayAmount({ identity: mockIdentity, ethAddress, poolId })
			).resolves.toBe(100_050_000n);
		});

		it('returns zero without a position or debt', async () => {
			getProfileId.mockResolvedValue(profileId);

			getPosition.mockResolvedValueOnce(null);

			await expect(
				getLiquidiumMaxRepayAmount({ identity: mockIdentity, ethAddress, poolId })
			).resolves.toBe(ZERO);

			getPosition.mockResolvedValueOnce({ borrowed: ZERO, debtInterest: 500_000n });

			await expect(
				getLiquidiumMaxRepayAmount({ identity: mockIdentity, ethAddress, poolId })
			).resolves.toBe(ZERO);
		});

		it('returns null with no identity or address', async () => {
			await expect(
				getLiquidiumMaxRepayAmount({ identity: null, ethAddress, poolId })
			).resolves.toBeNull();
			await expect(
				getLiquidiumMaxRepayAmount({ identity: mockIdentity, ethAddress: undefined, poolId })
			).resolves.toBeNull();
		});

		it('returns null when the user has no profile yet', async () => {
			getProfileId.mockResolvedValue(null);

			await expect(
				getLiquidiumMaxRepayAmount({ identity: mockIdentity, ethAddress, poolId })
			).resolves.toBeNull();
			expect(getPosition).not.toHaveBeenCalled();
			expect(getMaxRepayAmount).not.toHaveBeenCalled();
		});
	});

	describe('executeLiquidiumRepay', () => {
		const supply = vi.fn();
		const submit = vi.fn();
		const broadcast = vi.fn();
		const createActiveUserTransaction = vi.mocked(
			activeUserTransactionsServices.createActiveUserTransaction
		);
		const updateActiveUserTransaction = vi.mocked(
			activeUserTransactionsServices.updateActiveUserTransaction
		);
		const deleteActiveUserTransaction = vi.mocked(
			activeUserTransactionsServices.deleteActiveUserTransaction
		);

		const nativeTarget: SupplyTarget = {
			poolId,
			asset: 'BTC',
			chain: 'BTC',
			action: 'repayment',
			address: 'bc1qexample'
		};

		const buildFlow = (target: SupplyTarget): SupplyFlow => ({
			type: 'transfer',
			target,
			status: {
				operation: 'repayment',
				state: 'confirming',
				confirmations: null,
				requiredConfirmations: null
			},
			submit
		});

		const run = () =>
			executeLiquidiumRepay({
				identity: mockIdentity,
				ethAddress,
				poolId,
				chain: 'BTC',
				asset: 'BTC',
				amount: 100_000_000n,
				inflowFee: 50n,
				displayAmount: '1',
				progressStep: 'repaying',
				broadcast
			});

		beforeEach(() => {
			vi.clearAllMocks();
			// Also drops `*Once` answers a case queued but did not use, so they cannot leak into the next.
			createActiveUserTransaction.mockReset();
			updateActiveUserTransaction.mockReset();
			deleteActiveUserTransaction.mockReset();
			vi.mocked(liquidiumServices.getOrCreateLiquidiumProfile).mockResolvedValue(profileId);
			vi.mocked(liquidiumApi.liquidiumClient).mockReturnValue({
				lending: { supply }
			} as unknown as ReturnType<typeof liquidiumApi.liquidiumClient>);
			submit.mockResolvedValue({ success: true, txid: '0xhash' });
		});

		it('supplies with the repayment action, broadcasts the gross transfer and registers a Repay AUT', async () => {
			supply.mockResolvedValue(buildFlow(nativeTarget));
			broadcast.mockResolvedValue('0xhash');

			await run();

			expect(supply).toHaveBeenCalledExactlyOnceWith({
				profileId,
				poolId,
				chain: 'BTC',
				action: 'repayment'
			});
			// Gross transfer = net repayment (100_000_000) + provider inflow fee (50).
			expect(broadcast).toHaveBeenCalledExactlyOnceWith({
				target: nativeTarget,
				amount: 100_000_050n
			});
			expect(submit).toHaveBeenCalledExactlyOnceWith({ txid: '0xhash' });

			expect(analyticsServices.trackEvent).toHaveBeenCalledWith({
				name: TRACK_COUNT_LIQUIDIUM_SUBMITTED,
				metadata: { dApp: 'liquidium', action: 'repay', token: 'BTC', tokenAmount: '1' }
			});

			const [[{ data }]] = createActiveUserTransaction.mock.calls;

			expect(data).toEqual(
				expect.objectContaining({
					Liquidium: expect.objectContaining({
						pool_id: poolId,
						amount: 100_000_000n,
						action: { Repay: null }
					})
				})
			);
			expect(deleteActiveUserTransaction).not.toHaveBeenCalled();
		});

		it('records the AUT before broadcasting and adds the txid to it once sent', async () => {
			supply.mockResolvedValue(buildFlow(nativeTarget));
			broadcast.mockResolvedValue('0xhash');

			await run();

			const [[{ id, externalRefs }]] = createActiveUserTransaction.mock.calls;

			expect(createActiveUserTransaction.mock.invocationCallOrder[0]).toBeLessThan(
				broadcast.mock.invocationCallOrder[0]
			);
			expect(externalRefs).toEqual([
				{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.AMOUNT, value: '1' },
				{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.ASSET_SYMBOL, value: 'BTC' },
				{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID, value: profileId }
			]);

			// The whole ref set, since the backend replaces it wholesale.
			expect(updateActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				id,
				externalRefs: [
					{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.AMOUNT, value: '1' },
					{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.ASSET_SYMBOL, value: 'BTC' },
					{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID, value: profileId },
					{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.TXID, value: '0xhash' }
				]
			});
			// Before the SDK submit, so a tab closed during that call leaves the row its txid.
			expect(updateActiveUserTransaction.mock.invocationCallOrder[0]).toBeLessThan(
				submit.mock.invocationCallOrder[0]
			);
		});

		it('does not broadcast when the AUT cannot be recorded', async () => {
			supply.mockResolvedValue(buildFlow(nativeTarget));
			createActiveUserTransaction.mockRejectedValueOnce(new Error('TooManyActiveTransactions'));

			await expect(run()).rejects.toThrow('TooManyActiveTransactions');

			expect(broadcast).not.toHaveBeenCalled();
			expect(submit).not.toHaveBeenCalled();
			expect(analyticsServices.trackEvent).not.toHaveBeenCalled();
		});

		it('deletes the AUT when its create fails, in case only the answer was lost', async () => {
			supply.mockResolvedValue(buildFlow(nativeTarget));
			createActiveUserTransaction.mockRejectedValueOnce(new Error('agent timeout'));

			await expect(run()).rejects.toThrow('agent timeout');

			const [[{ id }]] = createActiveUserTransaction.mock.calls;

			expect(deleteActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				id
			});
		});

		it('deletes the AUT and rethrows when the broadcast fails', async () => {
			supply.mockResolvedValue(buildFlow(nativeTarget));
			broadcast.mockRejectedValueOnce(new Error('insufficient funds'));

			await expect(run()).rejects.toThrow('insufficient funds');

			const [[{ id }]] = createActiveUserTransaction.mock.calls;

			expect(deleteActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				id
			});
			expect(updateActiveUserTransaction).not.toHaveBeenCalled();
			expect(submit).not.toHaveBeenCalled();
			expect(analyticsServices.trackEvent).not.toHaveBeenCalled();
		});

		it('still rethrows the broadcast error when the AUT delete fails', async () => {
			supply.mockResolvedValue(buildFlow(nativeTarget));
			broadcast.mockRejectedValueOnce(new Error('insufficient funds'));
			deleteActiveUserTransaction.mockRejectedValueOnce(new Error('backend unavailable'));

			await expect(run()).rejects.toThrow('insufficient funds');
		});

		describe('while the broadcast is pending', () => {
			beforeEach(() => {
				vi.useFakeTimers();
			});

			afterEach(() => {
				vi.useRealTimers();
			});

			const pendingBroadcast = () => {
				let settle: { resolve: (txid: string) => void; reject: (err: Error) => void } = {
					resolve: () => {},
					reject: () => {}
				};

				broadcast.mockReturnValueOnce(
					new Promise<string>((resolve, reject) => {
						settle = { resolve, reject };
					})
				);

				return () => settle;
			};

			it('renews the AUT, and stops once the transfer is sent', async () => {
				supply.mockResolvedValue(buildFlow(nativeTarget));
				const settle = pendingBroadcast();

				const repaid = run();

				await vi.advanceTimersByTimeAsync(LIQUIDIUM_REPAY_LEASE_RENEWAL_MILLIS * 2);

				const [[{ id }]] = createActiveUserTransaction.mock.calls;

				// A write with nothing in it, so it cannot clobber the row's refs or status.
				expect(updateActiveUserTransaction).toHaveBeenCalledTimes(2);
				expect(updateActiveUserTransaction).toHaveBeenNthCalledWith(1, {
					identity: mockIdentity,
					id
				});

				settle().resolve('0xhash');
				await repaid;

				// + the txid write.
				expect(updateActiveUserTransaction).toHaveBeenCalledTimes(3);

				await vi.advanceTimersByTimeAsync(LIQUIDIUM_REPAY_LEASE_RENEWAL_MILLIS * 2);

				expect(updateActiveUserTransaction).toHaveBeenCalledTimes(3);
			});

			it('stops renewing the AUT once the broadcast fails', async () => {
				supply.mockResolvedValue(buildFlow(nativeTarget));
				const settle = pendingBroadcast();

				const repaid = run();

				await vi.advanceTimersByTimeAsync(LIQUIDIUM_REPAY_LEASE_RENEWAL_MILLIS);

				settle().reject(new Error('insufficient funds'));

				await expect(repaid).rejects.toThrow('insufficient funds');

				await vi.advanceTimersByTimeAsync(LIQUIDIUM_REPAY_LEASE_RENEWAL_MILLIS * 2);

				expect(updateActiveUserTransaction).toHaveBeenCalledOnce();
				expect(deleteActiveUserTransaction).toHaveBeenCalledOnce();
			});

			it('keeps the repay going when a renewal fails', async () => {
				supply.mockResolvedValue(buildFlow(nativeTarget));
				updateActiveUserTransaction.mockRejectedValueOnce(new Error('backend unavailable'));
				const settle = pendingBroadcast();

				const repaid = run();

				await vi.advanceTimersByTimeAsync(LIQUIDIUM_REPAY_LEASE_RENEWAL_MILLIS);

				settle().resolve('0xhash');

				await expect(repaid).resolves.toBeUndefined();
			});
		});

		// A poller took the row for abandoned while the broadcast outlasted the grace period.
		it('records the AUT again, with its txid, when it was deleted during the broadcast', async () => {
			supply.mockResolvedValue(buildFlow(nativeTarget));
			broadcast.mockResolvedValue('0xhash');
			updateActiveUserTransaction.mockRejectedValueOnce({ NotFound: null });

			await expect(run()).resolves.toBeUndefined();

			expect(createActiveUserTransaction).toHaveBeenCalledTimes(2);

			const [[first], [second]] = createActiveUserTransaction.mock.calls;

			expect(second).toEqual({
				...first,
				externalRefs: [
					{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.AMOUNT, value: '1' },
					{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.ASSET_SYMBOL, value: 'BTC' },
					{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID, value: profileId },
					{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.TXID, value: '0xhash' }
				]
			});
			expect(deleteActiveUserTransaction).not.toHaveBeenCalled();
		});

		it('does not record the AUT again when the txid write fails for another reason', async () => {
			supply.mockResolvedValue(buildFlow(nativeTarget));
			broadcast.mockResolvedValue('0xhash');
			updateActiveUserTransaction.mockRejectedValueOnce(new Error('backend unavailable'));

			await expect(run()).resolves.toBeUndefined();

			expect(createActiveUserTransaction).toHaveBeenCalledOnce();
		});

		it('resolves when recording the AUT again fails (funds already sent)', async () => {
			supply.mockResolvedValue(buildFlow(nativeTarget));
			broadcast.mockResolvedValue('0xhash');
			updateActiveUserTransaction.mockRejectedValueOnce({ NotFound: null });
			createActiveUserTransaction
				.mockResolvedValueOnce(undefined)
				.mockRejectedValueOnce({ TooManyActiveTransactions: null });

			await expect(run()).resolves.toBeUndefined();

			expect(createActiveUserTransaction).toHaveBeenCalledTimes(2);
			expect(submit).toHaveBeenCalledOnce();
		});

		it('resolves even if the txid write fails (funds already sent)', async () => {
			supply.mockResolvedValue(buildFlow(nativeTarget));
			broadcast.mockResolvedValue('0xhash');
			updateActiveUserTransaction.mockRejectedValueOnce(new Error('backend unavailable'));

			await expect(run()).resolves.toBeUndefined();

			expect(broadcast).toHaveBeenCalledOnce();
			expect(deleteActiveUserTransaction).not.toHaveBeenCalled();
		});

		it('resolves and still adds the txid when the SDK submit fails (txid is only an indexing hint)', async () => {
			supply.mockResolvedValue(buildFlow(nativeTarget));
			broadcast.mockResolvedValue('0xhash');
			submit.mockRejectedValueOnce(new Error('indexing hint rejected'));

			await expect(run()).resolves.toBeUndefined();

			expect(updateActiveUserTransaction).toHaveBeenCalledOnce();
		});

		it('reports progress and omits progressStep from the AUT when none is provided', async () => {
			supply.mockResolvedValue(buildFlow(nativeTarget));
			broadcast.mockResolvedValue('0xhash');

			const progress = vi.fn();

			await executeLiquidiumRepay({
				identity: mockIdentity,
				ethAddress,
				poolId,
				chain: 'BTC',
				asset: 'BTC',
				amount: 100_000_000n,
				inflowFee: 50n,
				displayAmount: '1',
				broadcast,
				progress
			});

			expect(progress).toHaveBeenCalledWith(ProgressStepsLiquidiumRepay.INITIALIZATION);
			expect(progress).toHaveBeenCalledWith(ProgressStepsLiquidiumRepay.DONE);

			const [[arg]] = createActiveUserTransaction.mock.calls;

			expect(arg).not.toHaveProperty('progressStep');
		});
	});

	describe('liquidiumRepaySpendable', () => {
		const held = ({ amount, tokenId = USDC_TOKEN.id }: { amount: bigint; tokenId?: TokenId }) => ({
			[`0x${amount.toString(16).padStart(64, '0')}`]: { tokenId, amount }
		});

		// 23.757982 USDC with a 16.40 repay still unmined in it, and a 1.40 provider fee.
		it('takes a held transfer out of the balance and the reserved fees out of the Max', () => {
			expect(
				liquidiumRepaySpendable({
					balance: 23_757_982n,
					tokenId: USDC_TOKEN.id,
					unminedRepays: held({ amount: 16_400_000n }),
					reserved: 1_400_000n
				})
			).toEqual({ spendable: 7_357_982n, maxSpendable: 5_957_982n });
		});

		it('adds up every held transfer of the token', () => {
			expect(
				liquidiumRepaySpendable({
					balance: 100n,
					tokenId: USDC_TOKEN.id,
					unminedRepays: { ...held({ amount: 10n }), ...held({ amount: 20n }) },
					reserved: 5n
				})
			).toEqual({ spendable: 70n, maxSpendable: 65n });
		});

		it('ignores the transfers held for another token', () => {
			expect(
				liquidiumRepaySpendable({
					balance: 100n,
					tokenId: USDC_TOKEN.id,
					unminedRepays: held({ amount: 10n, tokenId: ETHEREUM_TOKEN.id }),
					reserved: 5n
				})
			).toEqual({ spendable: 100n });
		});

		it('leaves the balance and the Max to the form with nothing held', () => {
			expect(
				liquidiumRepaySpendable({
					balance: 100n,
					tokenId: USDC_TOKEN.id,
					unminedRepays: {},
					reserved: 5n
				})
			).toEqual({ spendable: 100n });
		});

		it('floors at zero when the held transfers exceed the balance', () => {
			expect(
				liquidiumRepaySpendable({
					balance: 10n,
					tokenId: USDC_TOKEN.id,
					unminedRepays: held({ amount: 20n }),
					reserved: 5n
				})
			).toEqual({ spendable: ZERO, maxSpendable: ZERO });
		});

		it('floors the Max at zero when the fees use up what is left', () => {
			expect(
				liquidiumRepaySpendable({
					balance: 30n,
					tokenId: USDC_TOKEN.id,
					unminedRepays: held({ amount: 20n }),
					reserved: 15n
				})
			).toEqual({ spendable: 10n, maxSpendable: ZERO });
		});

		it('has no Max until the fees are known', () => {
			expect(
				liquidiumRepaySpendable({
					balance: 30n,
					tokenId: USDC_TOKEN.id,
					unminedRepays: held({ amount: 20n })
				})
			).toEqual({ spendable: 10n });
		});

		it.each([null, undefined])('passes a %s balance through', (balance) => {
			expect(
				liquidiumRepaySpendable({
					balance,
					tokenId: USDC_TOKEN.id,
					unminedRepays: held({ amount: 20n }),
					reserved: 5n
				})
			).toEqual({ spendable: balance });
		});
	});

	describe('holdLiquidiumRepayUntilMined', () => {
		const hash = `0x${'ab'.repeat(32)}`;
		const amount = 23_757_982n;

		const wait = vi.fn();

		beforeEach(() => {
			liquidiumUnminedRepaysStore.reset();

			wait.mockReset();
			vi.mocked(alchemyProviders, { partial: true }).mockReset().mockReturnValue({ wait });
			vi.mocked(reloadEthereumBalance).mockReset().mockResolvedValue({ success: true });
		});

		it('holds the amount back as soon as it is called', () => {
			wait.mockReturnValue(new Promise(() => {}));

			holdLiquidiumRepayUntilMined({ hash, token: USDC_TOKEN, amount });

			expect(get(liquidiumUnminedRepaysStore)).toEqual({
				[hash]: { tokenId: USDC_TOKEN.id, amount }
			});
		});

		it('waits on the token network for the transfer', async () => {
			wait.mockResolvedValue(undefined);

			await holdLiquidiumRepayUntilMined({ hash, token: USDC_TOKEN, amount });

			expect(alchemyProviders).toHaveBeenCalledWith(USDC_TOKEN.network.id);
			expect(wait).toHaveBeenCalledWith(hash);
		});

		it('keeps the amount held until the balance has reloaded after the transfer is mined', async () => {
			wait.mockResolvedValue(undefined);

			let heldDuringReload: unknown;

			vi.mocked(reloadEthereumBalance).mockImplementation(() => {
				heldDuringReload = get(liquidiumUnminedRepaysStore)[hash];

				return Promise.resolve({ success: true });
			});

			await holdLiquidiumRepayUntilMined({ hash, token: USDC_TOKEN, amount });

			expect(reloadEthereumBalance).toHaveBeenCalledWith(USDC_TOKEN);
			expect(heldDuringReload).toEqual({ tokenId: USDC_TOKEN.id, amount });
			expect(get(liquidiumUnminedRepaysStore)).toEqual({});
		});

		it('releases the amount and rejects when the wait fails', async () => {
			wait.mockRejectedValue(new Error('timed out'));

			await expect(
				holdLiquidiumRepayUntilMined({ hash, token: USDC_TOKEN, amount })
			).rejects.toThrow('timed out');

			expect(reloadEthereumBalance).not.toHaveBeenCalled();
			expect(get(liquidiumUnminedRepaysStore)).toEqual({});
		});

		it('releases the amount when the balance reload fails', async () => {
			wait.mockResolvedValue(undefined);
			vi.mocked(reloadEthereumBalance).mockRejectedValue(new Error('rpc down'));

			await expect(
				holdLiquidiumRepayUntilMined({ hash, token: USDC_TOKEN, amount })
			).rejects.toThrow('rpc down');

			expect(get(liquidiumUnminedRepaysStore)).toEqual({});
		});

		it('leaves the other held transfers in place', async () => {
			const other = `0x${'cd'.repeat(32)}`;

			liquidiumUnminedRepaysStore.add({ hash: other, tokenId: USDC_TOKEN.id, amount: 1n });

			wait.mockResolvedValue(undefined);

			await holdLiquidiumRepayUntilMined({ hash, token: USDC_TOKEN, amount });

			expect(get(liquidiumUnminedRepaysStore)).toEqual({
				[other]: { tokenId: USDC_TOKEN.id, amount: 1n }
			});
		});
	});
});
