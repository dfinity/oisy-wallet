import type { EthAddress } from '$eth/types/address';
import * as liquidiumApi from '$lib/api/liquidium.api';
import { TRACK_COUNT_LIQUIDIUM_SUBMITTED } from '$lib/constants/analytics.constants';
import * as activeUserTransactionsServices from '$lib/services/active-user-transactions.services';
import * as analyticsServices from '$lib/services/analytics.services';
import {
	computeLiquidiumBorrowPreview,
	executeLiquidiumBorrow
} from '$lib/services/liquidium-borrow.services';
import * as liquidiumServices from '$lib/services/liquidium.services';
import type { LiquidiumPortfolio } from '$lib/types/liquidium';
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

describe('liquidium-borrow.services', () => {
	const ethAddress = '0x1111111111111111111111111111111111111111' as EthAddress;
	const profileId = 'profile-1';
	const poolId = 'pool-btc';
	const receiverAddress = 'bc1qexample';

	const borrow = vi.fn();
	const createActiveUserTransaction = vi.mocked(
		activeUserTransactionsServices.createActiveUserTransaction
	);

	const run = () =>
		executeLiquidiumBorrow({
			identity: mockIdentity,
			ethAddress,
			poolId,
			chain: 'BTC',
			asset: 'BTC',
			amount: 100_000_000n,
			receiverAddress,
			displayAmount: '1',
			progressStep: 'borrowing'
		});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(liquidiumServices.getOrCreateLiquidiumProfile).mockResolvedValue(profileId);
		vi.mocked(liquidiumApi.liquidiumClient).mockReturnValue({
			lending: { borrow }
		} as unknown as ReturnType<typeof liquidiumApi.liquidiumClient>);
	});

	it('signs/submits the borrow and registers the transaction, correlating by outflow id', async () => {
		borrow.mockResolvedValue({ id: 'outflow-1', outflowType: 'borrow', amount: 100_000_000n });

		await run();

		expect(borrow).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				profileId,
				poolId,
				amount: 100_000_000n,
				chain: 'BTC',
				receiver: receiverAddress,
				signerWalletAddress: ethAddress,
				signerChain: 'ETH'
			})
		);

		expect(analyticsServices.trackEvent).toHaveBeenCalledWith({
			name: TRACK_COUNT_LIQUIDIUM_SUBMITTED,
			metadata: { dApp: 'liquidium', action: 'borrow', token: 'BTC', tokenAmount: '1' }
		});

		expect(createActiveUserTransaction).toHaveBeenCalledOnce();

		const [[{ data, externalRefs }]] = createActiveUserTransaction.mock.calls;

		expect(data).toEqual(
			expect.objectContaining({
				Liquidium: expect.objectContaining({
					pool_id: poolId,
					amount: 100_000_000n,
					action: { Borrow: null }
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
		borrow.mockResolvedValue({
			id: 'outflow-1',
			outflowType: 'borrow',
			amount: 100_000_000n,
			txid: '0xhash'
		});

		await run();

		const [[{ externalRefs }]] = createActiveUserTransaction.mock.calls;

		expect(externalRefs).toEqual(
			expect.arrayContaining([{ key: LIQUIDIUM_EXTERNAL_REF_KEYS.TXID, value: '0xhash' }])
		);
	});

	it('resolves even if AUT bookkeeping fails (borrow already committed)', async () => {
		borrow.mockResolvedValue({ id: 'outflow-1', outflowType: 'borrow', amount: 100_000_000n });
		createActiveUserTransaction.mockRejectedValueOnce(new Error('backend unavailable'));

		await expect(run()).resolves.toBeUndefined();

		expect(borrow).toHaveBeenCalledOnce();
	});
});

describe('computeLiquidiumBorrowPreview', () => {
	// $100k collateral, no debt, 80% liquidation threshold, $80k borrowing power left.
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

	it('reflects the current LTV / health for a zero borrow', () => {
		const preview = computeLiquidiumBorrowPreview({ portfolio: portfolio(), newBorrowUsd: 0 });

		expect(preview.resultingLtvPercent).toBe(0);
		expect(preview.projectedHealthPercent).toBe(100);
		expect(preview.healthLevel).toBe('healthy');
		expect(preview.valid).toBeTruthy();
	});

	it('includes existing debt in the resulting LTV', () => {
		const preview = computeLiquidiumBorrowPreview({
			portfolio: portfolio({ totalBorrowedUsd: 10_000, availableBorrowsUsd: 70_000 }),
			newBorrowUsd: 30_000
		});

		// (10k existing + 30k new) / 100k collateral.
		expect(preview.resultingLtvPercent).toBeCloseTo(40, 5);
	});

	it('derives the health level from the projected health', () => {
		// marginal = 76k / (100k × 0.8) = 95% → projected 5% → critical.
		const preview = computeLiquidiumBorrowPreview({ portfolio: portfolio(), newBorrowUsd: 76_000 });

		expect(preview.projectedHealthPercent).toBeCloseTo(5, 5);
		expect(preview.healthLevel).toBe('critical');
		expect(preview.valid).toBeTruthy();
	});

	it('is invalid when the borrow exceeds the borrowing power', () => {
		const preview = computeLiquidiumBorrowPreview({ portfolio: portfolio(), newBorrowUsd: 90_000 });

		expect(preview.valid).toBeFalsy();
	});

	it('stays valid for a borrow exactly at the cap (rounding tolerance)', () => {
		const preview = computeLiquidiumBorrowPreview({ portfolio: portfolio(), newBorrowUsd: 80_000 });

		expect(preview.valid).toBeTruthy();
	});
});
