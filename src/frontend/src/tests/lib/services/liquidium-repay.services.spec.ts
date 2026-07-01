import type { EthAddress } from '$eth/types/address';
import * as liquidiumApi from '$lib/api/liquidium.api';
import { TRACK_COUNT_LIQUIDIUM_SUBMITTED } from '$lib/constants/analytics.constants';
import { ZERO } from '$lib/constants/app.constants';
import { ProgressStepsLiquidiumRepay } from '$lib/enums/progress-steps';
import * as activeUserTransactionsServices from '$lib/services/active-user-transactions.services';
import * as analyticsServices from '$lib/services/analytics.services';
import {
	computeLiquidiumRepayPreview,
	executeLiquidiumRepay,
	getLiquidiumMaxRepayAmount,
	liquidiumDebtInterestUsd
} from '$lib/services/liquidium-repay.services';
import * as liquidiumServices from '$lib/services/liquidium.services';
import type { LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import { LIQUIDIUM_EXTERNAL_REF_KEYS } from '$lib/types/liquidium-active-tx';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { NativeAddressSupplyTarget, SupplyFlow, SupplyTarget } from '@liquidium/client';

vi.mock('$lib/api/liquidium.api', () => ({ liquidiumClient: vi.fn() }));
vi.mock('$lib/services/liquidium.services', () => ({ getOrCreateLiquidiumProfile: vi.fn() }));
vi.mock('$lib/services/active-user-transactions.services', () => ({
	createActiveUserTransaction: vi.fn()
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

	describe('getLiquidiumMaxRepayAmount', () => {
		const getProfileId = vi.fn();
		const getMaxRepayAmount = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();
			vi.mocked(liquidiumApi.liquidiumClient).mockReturnValue({
				accounts: { getProfileId },
				positions: { getMaxRepayAmount }
			} as unknown as ReturnType<typeof liquidiumApi.liquidiumClient>);
		});

		it('returns the full debt amount from the SDK', async () => {
			getProfileId.mockResolvedValue(profileId);
			getMaxRepayAmount.mockResolvedValue({ amount: 100_010_000n, decimals: 8n });

			const amount = await getLiquidiumMaxRepayAmount({
				identity: mockIdentity,
				ethAddress,
				poolId
			});

			expect(amount).toBe(100_010_000n);
			expect(getMaxRepayAmount).toHaveBeenCalledExactlyOnceWith(profileId, poolId);
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

		const nativeTarget: NativeAddressSupplyTarget = {
			type: 'nativeAddress',
			poolId,
			asset: 'BTC',
			chain: 'BTC',
			action: 'repayment',
			address: 'bc1qexample'
		};

		const buildFlow = (target: SupplyTarget): SupplyFlow => ({ type: 'transfer', target, submit });

		const run = () =>
			executeLiquidiumRepay({
				identity: mockIdentity,
				ethAddress,
				poolId,
				asset: 'BTC',
				amount: 100_000_000n,
				inflowFee: 50n,
				displayAmount: '1',
				progressStep: 'repaying',
				broadcast
			});

		beforeEach(() => {
			vi.clearAllMocks();
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

			expect(supply).toHaveBeenCalledExactlyOnceWith({ profileId, poolId, action: 'repayment' });
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

			const [[{ data, externalRefs }]] = createActiveUserTransaction.mock.calls;

			expect(data).toEqual(
				expect.objectContaining({
					Liquidium: expect.objectContaining({
						pool_id: poolId,
						amount: 100_000_000n,
						action: { Repay: null }
					})
				})
			);
			expect(externalRefs).toEqual(
				expect.arrayContaining([
					{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID, value: profileId },
					{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.ASSET_SYMBOL, value: 'BTC' },
					{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.TXID, value: '0xhash' }
				])
			);
		});

		it('resolves even if post-broadcast bookkeeping fails (funds already sent)', async () => {
			supply.mockResolvedValue(buildFlow(nativeTarget));
			broadcast.mockResolvedValue('0xhash');
			createActiveUserTransaction.mockRejectedValueOnce(new Error('backend unavailable'));

			await expect(run()).resolves.toBeUndefined();

			expect(broadcast).toHaveBeenCalledOnce();
		});

		it('resolves and still registers the AUT when the SDK submit fails (txid is only an indexing hint)', async () => {
			supply.mockResolvedValue(buildFlow(nativeTarget));
			broadcast.mockResolvedValue('0xhash');
			submit.mockRejectedValueOnce(new Error('indexing hint rejected'));

			await expect(run()).resolves.toBeUndefined();

			expect(createActiveUserTransaction).toHaveBeenCalledOnce();
		});

		it('reports progress and omits progressStep from the AUT when none is provided', async () => {
			supply.mockResolvedValue(buildFlow(nativeTarget));
			broadcast.mockResolvedValue('0xhash');

			const progress = vi.fn();

			await executeLiquidiumRepay({
				identity: mockIdentity,
				ethAddress,
				poolId,
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

		it('rejects an icrcAccount target and registers nothing', async () => {
			supply.mockResolvedValue(
				buildFlow({
					type: 'icrcAccount',
					poolId,
					asset: 'BTC',
					chain: 'BTC',
					action: 'repayment',
					owner: 'aaaaa-aa',
					subaccount: new Uint8Array(),
					account: 'icrc-account-text'
				})
			);

			await expect(run()).rejects.toThrow('unsupported');
			expect(broadcast).not.toHaveBeenCalled();
			expect(createActiveUserTransaction).not.toHaveBeenCalled();
		});
	});
});
