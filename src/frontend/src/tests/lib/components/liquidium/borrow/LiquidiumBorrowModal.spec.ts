import LiquidiumBorrowModal from '$lib/components/liquidium/borrow/LiquidiumBorrowModal.svelte';
import * as addressesStore from '$lib/derived/address.derived';
import * as liquidiumBorrowServices from '$lib/services/liquidium-borrow.services';
import * as liquidiumSolServices from '$lib/services/liquidium-sol.services';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import type { LiquidiumMarket, LiquidiumPortfolio } from '$lib/types/liquidium';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { runResolvedPromises } from '$tests/utils/timers.test-utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('LiquidiumBorrowModal', () => {
	const market: LiquidiumMarket = {
		poolId: 'pool-sol',
		asset: 'SOL',
		chain: 'SOL',
		supplyApy: 4,
		borrowApy: 8,
		frozen: false,
		available: true
	};

	const portfolio: LiquidiumPortfolio = {
		reserves: [],
		totalSuppliedUsd: 1_000,
		totalBorrowedUsd: 0,
		netValueUsd: 1_000,
		availableBorrowsUsd: 500,
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

		liquidiumStore.set({ markets: [market], portfolio, assetPrices: { SOL: 150 } });

		// Mainnet today: the minter's 0.002 SOL minimum withdrawal and two 500-lamport ledger fees.
		vi.spyOn(liquidiumSolServices, 'getLiquidiumSolNativeOutflowMinimum').mockResolvedValue(
			2_001_000n
		);
	});

	it("holds a native SOL borrow to the ckSOL minter's minimum", async () => {
		const { container } = render(LiquidiumBorrowModal, { props: { market } });

		await waitFor(() => expect(container).toHaveTextContent('0.002001 SOL'));
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
			const { container, getByPlaceholderText } = render(LiquidiumBorrowModal, {
				props: { market }
			});

			await vi.advanceTimersByTimeAsync(0);

			await fireEvent.input(getByPlaceholderText('0'), { target: { value: '0.002' } });
			await vi.advanceTimersByTimeAsync(VALIDATION_DEBOUNCE_MS);

			expect(container).not.toHaveTextContent(en.liquidium.text.borrow_below_minimum);

			resolveMinimum(2_001_000n);
			await vi.advanceTimersByTimeAsync(VALIDATION_DEBOUNCE_MS);

			expect(container).toHaveTextContent(en.liquidium.text.borrow_below_minimum);
		});
	});

	it('reads no minter minimum for the ckSOL rail', async () => {
		const { container } = render(LiquidiumBorrowModal, {
			props: { market: { ...market, chain: 'ICP' } }
		});

		await waitFor(() => expect(container).toHaveTextContent(en.liquidium.text.borrow_apy));
		await runResolvedPromises();

		expect(liquidiumSolServices.getLiquidiumSolNativeOutflowMinimum).not.toHaveBeenCalled();
	});

	it('borrows native SOL to the mainnet SOL address', async () => {
		const executeSpy = vi
			.spyOn(liquidiumBorrowServices, 'executeLiquidiumBorrow')
			.mockResolvedValue(undefined);

		const { getByPlaceholderText, getByRole } = render(LiquidiumBorrowModal, {
			props: { market }
		});

		await fireEvent.input(getByPlaceholderText('0'), { target: { value: '0.5' } });

		const review = getByRole('button', { name: en.send.text.review });

		await waitFor(() => expect(review).toBeEnabled());
		await fireEvent.click(review);

		await fireEvent.click(
			await waitFor(() => getByRole('button', { name: en.liquidium.text.action_borrow }))
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
