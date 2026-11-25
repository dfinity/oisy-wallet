import LiquidiumWithdrawModal from '$lib/components/liquidium/withdraw/LiquidiumWithdrawModal.svelte';
import { ZERO } from '$lib/constants/app.constants';
import * as addressesStore from '$lib/derived/address.derived';
import * as liquidiumSolServices from '$lib/services/liquidium-sol.services';
import * as liquidiumWithdrawServices from '$lib/services/liquidium-withdraw.services';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import type { LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { runResolvedPromises } from '$tests/utils/timers.test-utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('LiquidiumWithdrawModal', () => {
	const reserve: LiquidiumReserve = {
		poolId: 'pool-sol',
		asset: 'SOL',
		chain: 'SOL',
		supplyApy: 4,
		borrowApy: 8,
		deposited: 1_000_000_000n,
		depositedDecimals: 9,
		borrowed: ZERO,
		borrowedDecimals: 9,
		debtInterest: ZERO,
		suppliedUsd: 150,
		borrowedUsd: 0
	};

	const portfolio: LiquidiumPortfolio = {
		reserves: [reserve],
		totalSuppliedUsd: 150,
		totalBorrowedUsd: 0,
		netValueUsd: 150,
		availableBorrowsUsd: 100,
		weightedLiquidationThresholdBps: 8_000,
		healthFactorPercent: 100
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();
		vi.spyOn(addressesStore, 'ethAddress', 'get').mockImplementation(() =>
			readable(mockEthAddress)
		);
		vi.spyOn(addressesStore, 'solAddressMainnet', 'get').mockImplementation(() =>
			readable(mockSolAddress)
		);

		liquidiumStore.set({ markets: [], portfolio, assetPrices: { SOL: 150 } });

		// Mainnet today: the minter's 0.002 SOL minimum withdrawal and two 500-lamport ledger fees.
		vi.spyOn(liquidiumSolServices, 'getLiquidiumSolNativeOutflowMinimum').mockResolvedValue(
			2_001_000n
		);
	});

	it("holds a native SOL withdrawal to the ckSOL minter's minimum", async () => {
		const { container } = render(LiquidiumWithdrawModal, { props: { reserve } });

		await waitFor(() => expect(container).toHaveTextContent(en.liquidium.text.minimum_withdraw));

		expect(container).toHaveTextContent('0.002001 SOL');
	});

	// The amount can be checked before the minter answers: the arriving minimum has to check it again,
	// or Review is disabled with no reason shown.
	describe('a minimum that arrives after the amount was checked', () => {
		// The input validates on a 300ms debounce.
		const VALIDATION_DEBOUNCE_MS = 300;

		let resolveMinimum: (minimum: bigint) => void;

		beforeEach(() => {
			vi.useFakeTimers();

			vi.mocked(liquidiumSolServices.getLiquidiumSolNativeOutflowMinimum).mockReturnValue(
				new Promise((resolve) => {
					resolveMinimum = resolve;
				})
			);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('shows the below-minimum error', async () => {
			const { container, getByPlaceholderText } = render(LiquidiumWithdrawModal, {
				props: { reserve }
			});

			await vi.advanceTimersByTimeAsync(0);

			await fireEvent.input(getByPlaceholderText('0'), { target: { value: '0.002' } });
			await vi.advanceTimersByTimeAsync(VALIDATION_DEBOUNCE_MS);

			expect(container).not.toHaveTextContent(en.liquidium.text.withdraw_below_minimum);

			resolveMinimum(2_001_000n);
			await vi.advanceTimersByTimeAsync(VALIDATION_DEBOUNCE_MS);

			expect(container).toHaveTextContent(en.liquidium.text.withdraw_below_minimum);
		});
	});

	// Only the protocol's 0.001 SOL minimum applies there.
	it('reads no minter minimum for the ckSOL rail', async () => {
		const { container } = render(LiquidiumWithdrawModal, {
			props: { reserve: { ...reserve, chain: 'ICP' } }
		});

		await waitFor(() => expect(container).toHaveTextContent(en.liquidium.text.supplied_label));
		await runResolvedPromises();

		expect(liquidiumSolServices.getLiquidiumSolNativeOutflowMinimum).not.toHaveBeenCalled();
		expect(container).toHaveTextContent('0.001 SOL');
		expect(container).not.toHaveTextContent('0.002001 SOL');
	});

	it('withdraws native SOL to the mainnet SOL address', async () => {
		const executeSpy = vi
			.spyOn(liquidiumWithdrawServices, 'executeLiquidiumWithdraw')
			.mockResolvedValue(undefined);

		const { getByPlaceholderText, getByRole } = render(LiquidiumWithdrawModal, {
			props: { reserve }
		});

		await fireEvent.input(getByPlaceholderText('0'), { target: { value: '0.5' } });

		const review = getByRole('button', { name: en.send.text.review });

		await waitFor(() => expect(review).toBeEnabled());
		await fireEvent.click(review);

		await fireEvent.click(
			await waitFor(() => getByRole('button', { name: en.liquidium.text.action_withdraw }))
		);

		await waitFor(() =>
			expect(executeSpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					poolId: 'pool-sol',
					asset: 'SOL',
					chain: 'SOL',
					amount: 500_000_000n,
					receiverAddress: mockSolAddress
				})
			)
		);
	});
});
