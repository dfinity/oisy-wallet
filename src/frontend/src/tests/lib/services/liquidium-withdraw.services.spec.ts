import type { EthAddress } from '$eth/types/address';
import * as liquidiumApi from '$lib/api/liquidium.api';
import { TRACK_COUNT_LIQUIDIUM_SUBMITTED } from '$lib/constants/analytics.constants';
import { ZERO } from '$lib/constants/app.constants';
import * as activeUserTransactionsServices from '$lib/services/active-user-transactions.services';
import * as analyticsServices from '$lib/services/analytics.services';
import {
	computeLiquidiumWithdrawPreview,
	executeLiquidiumWithdraw
} from '$lib/services/liquidium-withdraw.services';
import * as liquidiumServices from '$lib/services/liquidium.services';
import type { LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import { LIQUIDIUM_EXTERNAL_REF_KEYS } from '$lib/types/liquidium-active-tx';
import { mockIdentity } from '$tests/mocks/identity.mock';

vi.mock('$lib/api/liquidium.api', () => ({ liquidiumClient: vi.fn() }));
vi.mock('$lib/services/liquidium.services', () => ({ getOrCreateLiquidiumProfile: vi.fn() }));
vi.mock('$lib/services/liquidium-wallet-adapter.services', () => ({
	liquidiumWalletAdapter: vi.fn(() => ({ signMessage: vi.fn() }))
}));
vi.mock('$lib/services/active-user-transactions.services', () => ({
	createActiveUserTransaction: vi.fn()
}));
vi.mock('$lib/services/analytics.services', () => ({ trackEvent: vi.fn() }));

describe('liquidium-withdraw.services', () => {
	const ethAddress = '0x1111111111111111111111111111111111111111' as EthAddress;
	const profileId = 'profile-1';
	const poolId = 'pool-btc';
	const receiverAddress = 'bc1qexample';

	const withdraw = vi.fn();
	const createActiveUserTransaction = vi.mocked(
		activeUserTransactionsServices.createActiveUserTransaction
	);

	const run = () =>
		executeLiquidiumWithdraw({
			identity: mockIdentity,
			ethAddress,
			poolId,
			asset: 'BTC',
			amount: 50_000_000n,
			receiverAddress,
			displayAmount: '0.5',
			progressStep: 'withdrawing'
		});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(liquidiumServices.getOrCreateLiquidiumProfile).mockResolvedValue(profileId);
		vi.mocked(liquidiumApi.liquidiumClient).mockReturnValue({
			lending: { withdraw }
		} as unknown as ReturnType<typeof liquidiumApi.liquidiumClient>);
	});

	it('signs/submits the withdraw and registers the transaction, correlating by outflow id', async () => {
		withdraw.mockResolvedValue({ id: 'outflow-1', outflowType: 'withdraw', amount: 50_000_000n });

		await run();

		expect(withdraw).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				profileId,
				poolId,
				amount: 50_000_000n,
				receiverAddress,
				signerWalletAddress: ethAddress,
				signerChain: 'ETH'
			})
		);

		expect(analyticsServices.trackEvent).toHaveBeenCalledWith({
			name: TRACK_COUNT_LIQUIDIUM_SUBMITTED,
			metadata: { dApp: 'liquidium', action: 'withdraw', token: 'BTC', tokenAmount: '0.5' }
		});

		expect(createActiveUserTransaction).toHaveBeenCalledOnce();

		const [[{ data, externalRefs }]] = createActiveUserTransaction.mock.calls;

		expect(data).toEqual(
			expect.objectContaining({
				Liquidium: expect.objectContaining({
					pool_id: poolId,
					amount: 50_000_000n,
					action: { Withdraw: null }
				})
			})
		);
		expect(externalRefs).toEqual(
			expect.arrayContaining([
				{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID, value: profileId },
				{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.OUTFLOW_ID, value: 'outflow-1' },
				{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.ASSET_SYMBOL, value: 'BTC' }
			])
		);
		// No txid yet — must not be persisted as an empty ref.
		expect(externalRefs).not.toEqual(
			expect.arrayContaining([expect.objectContaining({ key: LIQUIDIUM_EXTERNAL_REF_KEYS.TXID })])
		);
	});

	it('persists the txid when the receipt already carries one', async () => {
		withdraw.mockResolvedValue({
			id: 'outflow-1',
			outflowType: 'withdraw',
			amount: 50_000_000n,
			txid: '0xhash'
		});

		await run();

		const [[{ externalRefs }]] = createActiveUserTransaction.mock.calls;

		expect(externalRefs).toEqual(
			expect.arrayContaining([{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.TXID, value: '0xhash' }])
		);
	});

	it('resolves even if AUT bookkeeping fails (withdraw already committed)', async () => {
		withdraw.mockResolvedValue({ id: 'outflow-1', outflowType: 'withdraw', amount: 50_000_000n });
		createActiveUserTransaction.mockRejectedValueOnce(new Error('backend unavailable'));

		await expect(run()).resolves.toBeUndefined();

		expect(withdraw).toHaveBeenCalledOnce();
	});
});

describe('computeLiquidiumWithdrawPreview', () => {
	// 1 BTC supplied (= $100k collateral), 80% liquidation threshold.
	const reserve = (overrides: Partial<LiquidiumReserve> = {}): LiquidiumReserve => ({
		poolId: 'pool-btc',
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 5,
		borrowApy: 0,
		deposited: 100_000_000n,
		depositedDecimals: 8,
		borrowed: ZERO,
		borrowedDecimals: 8,
		suppliedUsd: 100_000,
		borrowedUsd: 0,
		...overrides
	});

	const portfolio = (overrides: Partial<LiquidiumPortfolio> = {}): LiquidiumPortfolio => ({
		reserves: [],
		totalSuppliedUsd: 100_000,
		totalBorrowedUsd: 0,
		netValueUsd: 100_000,
		availableBorrowsUsd: 80_000,
		weightedLiquidationThresholdBps: 8000,
		healthFactorPercent: 100,
		...overrides
	});

	it('allows the full supplied balance and stays healthy when there is no debt', () => {
		const preview = computeLiquidiumWithdrawPreview({
			portfolio: portfolio(),
			reserve: reserve(),
			withdrawUsd: 100_000
		});

		expect(preview.maxWithdrawableUsd).toBe(100_000);
		expect(preview.reservedByDebtUsd).toBe(0);
		expect(preview.projectedHealthPercent).toBe(100);
		expect(preview.healthLevel).toBe('healthy');
		expect(preview.valid).toBeTruthy();
	});

	it('caps the withdraw at the free collateral when debt is open', () => {
		// debt $20k, threshold 0.8 → reserved = 20k / 0.8 = $25k; free = $75k.
		const preview = computeLiquidiumWithdrawPreview({
			portfolio: portfolio({ totalBorrowedUsd: 20_000 }),
			reserve: reserve(),
			withdrawUsd: 0
		});

		expect(preview.maxWithdrawableUsd).toBeCloseTo(75_000, 5);
		expect(preview.reservedByDebtUsd).toBeCloseTo(25_000, 5);
	});

	it('lowers the projected health as collateral is removed', () => {
		// remaining collateral = 100k − 50k = 50k; ltv = 20k/50k = 0.4; health = (1 − 0.4/0.8)×100 = 50.
		const preview = computeLiquidiumWithdrawPreview({
			portfolio: portfolio({ totalBorrowedUsd: 20_000 }),
			reserve: reserve(),
			withdrawUsd: 50_000
		});

		expect(preview.projectedHealthPercent).toBeCloseTo(50, 5);
	});

	it('is invalid when the withdraw exceeds the free collateral', () => {
		const preview = computeLiquidiumWithdrawPreview({
			portfolio: portfolio({ totalBorrowedUsd: 20_000 }),
			reserve: reserve(),
			withdrawUsd: 80_000
		});

		expect(preview.valid).toBeFalsy();
	});

	it('stays valid for a withdraw exactly at the cap (rounding tolerance)', () => {
		const preview = computeLiquidiumWithdrawPreview({
			portfolio: portfolio({ totalBorrowedUsd: 20_000 }),
			reserve: reserve(),
			withdrawUsd: 75_000
		});

		expect(preview.valid).toBeTruthy();
	});

	it('reports a critical health level near liquidation', () => {
		// remaining = 100k − 74k = 26k; ltv = 20k/26k ≈ 0.769; health ≈ (1 − 0.961)×100 ≈ 3.8 → critical.
		const preview = computeLiquidiumWithdrawPreview({
			portfolio: portfolio({ totalBorrowedUsd: 20_000 }),
			reserve: reserve(),
			withdrawUsd: 74_000
		});

		expect(preview.healthLevel).toBe('critical');
	});
});
