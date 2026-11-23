import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import type { EthAddress, OptionEthAddress } from '$eth/types/address';
import LiquidiumRepayModal from '$lib/components/liquidium/repay/LiquidiumRepayModal.svelte';
import { ZERO } from '$lib/constants/app.constants';
import {
	STAKE_FORM_REVIEW_BUTTON,
	STAKE_REVIEW_FORM_BUTTON
} from '$lib/constants/test-ids.constants';
import * as addressesStore from '$lib/derived/address.derived';
import * as liquidiumRepayServices from '$lib/services/liquidium-repay.services';
import * as liquidiumSupplyServices from '$lib/services/liquidium-supply.services';
import { activeUserTransactionsStore } from '$lib/stores/active-user-transactions.store';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import type { LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import {
	mockLiquidiumActiveUserTransaction,
	mockNearIntentsActiveUserTransaction
} from '$tests/mocks/active-user-transactions.mock';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { runResolvedPromises } from '$tests/utils/timers.test-utils';
import type { InflowFeeEstimate } from '@liquidium/client';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { readable, writable, type Writable } from 'svelte/store';

vi.mock('$sol/api/solana.api', () => ({
	estimatePriorityFee: vi.fn().mockResolvedValue(1_000_000n)
}));

describe('LiquidiumRepayModal', () => {
	const reserve: LiquidiumReserve = {
		poolId: 'pool-icp',
		asset: 'ICP',
		chain: 'ICP',
		supplyApy: 0,
		borrowApy: 10,
		deposited: ZERO,
		depositedDecimals: 8,
		borrowed: 100_000_000n,
		borrowedDecimals: 8,
		debtInterest: ZERO,
		suppliedUsd: 0,
		borrowedUsd: 12
	};

	const portfolio: LiquidiumPortfolio = {
		reserves: [reserve],
		totalSuppliedUsd: 100,
		totalBorrowedUsd: 12,
		netValueUsd: 88,
		availableBorrowsUsd: 50,
		weightedLiquidationThresholdBps: 8_000,
		healthFactorPercent: 80
	};

	const pendingRepay: ActiveUserTransaction = {
		...mockLiquidiumActiveUserTransaction,
		data: {
			Liquidium: {
				token: { Icrc: mockIdentity.getPrincipal() },
				action: { Repay: null },
				pool_id: 'pool-icp',
				amount: 50_000_000n
			}
		}
	};

	let maxRepaySpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();

		mockAuthStore();
		vi.spyOn(addressesStore, 'ethAddress', 'get').mockImplementation(() =>
			readable(mockEthAddress)
		);

		liquidiumStore.set({ markets: [], portfolio, assetPrices: {} });

		activeUserTransactionsStore.reset();
		activeUserTransactionsStore.init(mockIdentity.getPrincipal());
		activeUserTransactionsStore.upsert({ transaction: pendingRepay });

		vi.spyOn(liquidiumSupplyServices, 'estimateLiquidiumInflowFee').mockResolvedValue({
			totalFee: 50n
		});
		maxRepaySpy = vi
			.spyOn(liquidiumRepayServices, 'getLiquidiumMaxRepayAmount')
			.mockResolvedValue(100_000_000n);
	});

	it('shows the pending repays of the position', async () => {
		const { container } = render(LiquidiumRepayModal, { props: { reserve } });

		await waitFor(() => expect(container).toHaveTextContent(en.liquidium.text.pending_repays));
	});

	it("quotes the provider fee for the reserve's pool as a repayment", async () => {
		render(LiquidiumRepayModal, { props: { reserve } });

		await waitFor(() =>
			expect(liquidiumSupplyServices.estimateLiquidiumInflowFee).toHaveBeenCalledWith({
				identity: mockIdentity,
				ethAddress: mockEthAddress,
				asset: reserve.asset,
				chain: reserve.chain,
				poolId: reserve.poolId,
				action: 'repayment'
			})
		);
	});

	// Without the quote's minimum the SOL wizard runs no small-repay check, and a native repay below
	// what Liquidium credits would wait at the deposit address while the debt stays.
	it("blocks a native SOL repay below the quote's minimum", async () => {
		vi.spyOn(addressesStore, 'solAddressMainnet', 'get').mockImplementation(() =>
			readable(mockSolAddress)
		);
		vi.mocked(liquidiumSupplyServices.estimateLiquidiumInflowFee).mockResolvedValue({
			totalFee: 1_884_122n,
			minimumSendAmount: 20_000_000n
		});

		const { container, getByPlaceholderText } = render(LiquidiumRepayModal, {
			props: {
				reserve: {
					...reserve,
					poolId: 'pool-sol',
					asset: 'SOL',
					chain: 'SOL',
					borrowed: 1_000_000_000n,
					borrowedDecimals: 9,
					borrowedUsd: 150
				}
			}
		});

		await waitFor(() => expect(maxRepaySpy).toHaveBeenCalledOnce());

		await fireEvent.input(getByPlaceholderText('0'), { target: { value: '0.01' } });

		await waitFor(() =>
			expect(container).toHaveTextContent(
				replacePlaceholders(en.liquidium.text.repay_below_native_minimum, {
					$amount: '0.018115878 SOL'
				})
			)
		);
	});

	describe('a superseded fee quote', () => {
		// The quote reruns whenever its inputs change: a rail picked from the list, or, as here, the
		// Ethereum address that owns the profile. Either way the earlier quote is superseded.
		const otherEthAddress = '0x2222222222222222222222222222222222222222' as EthAddress;
		const currentFee = 50_000n;
		const staleFee = 7_000_000n;

		let address: Writable<OptionEthAddress>;
		let settleStale: {
			resolve?: (estimate: InflowFeeEstimate) => void;
			reject?: (err: unknown) => void;
		};

		beforeEach(() => {
			address = writable<OptionEthAddress>(mockEthAddress);
			vi.spyOn(addressesStore, 'ethAddress', 'get').mockImplementation(() => address);

			settleStale = {};

			vi.mocked(liquidiumSupplyServices.estimateLiquidiumInflowFee)
				.mockReturnValueOnce(
					new Promise((resolve, reject) => {
						settleStale = { resolve, reject };
					})
				)
				.mockResolvedValue({ totalFee: currentFee });
		});

		const renderWithCurrentQuote = async (): Promise<HTMLElement> => {
			const { container } = render(LiquidiumRepayModal, { props: { reserve } });

			await waitFor(() =>
				expect(liquidiumSupplyServices.estimateLiquidiumInflowFee).toHaveBeenCalledOnce()
			);

			address.set(otherEthAddress);

			await waitFor(() =>
				expect(liquidiumSupplyServices.estimateLiquidiumInflowFee).toHaveBeenCalledTimes(2)
			);
			await waitFor(() => expect(container).toHaveTextContent('0.0005'));

			return container;
		};

		it('does not overwrite the current fee when it answers late', async () => {
			const container = await renderWithCurrentQuote();

			settleStale.resolve?.({ totalFee: staleFee });
			await runResolvedPromises();
			await runResolvedPromises();

			expect(container).toHaveTextContent('0.0005');
			expect(container).not.toHaveTextContent('0.07');
		});

		it('does not mark the current fee unavailable when it fails late', async () => {
			const container = await renderWithCurrentQuote();

			settleStale.reject?.(new Error('stale oracle price'));
			await runResolvedPromises();
			await runResolvedPromises();

			expect(container).toHaveTextContent('0.0005');
			expect(container).not.toHaveTextContent(en.liquidium.text.repay_prices_unavailable);
		});
	});

	it('refetches the protocol max once a pending repay settles', async () => {
		render(LiquidiumRepayModal, { props: { reserve } });

		await waitFor(() => expect(maxRepaySpy).toHaveBeenCalledOnce());

		activeUserTransactionsStore.upsert({
			transaction: { ...pendingRepay, status: { Succeeded: null } }
		});

		await waitFor(() => expect(maxRepaySpy).toHaveBeenCalledTimes(2));
	});

	it('does not refetch the protocol max when an unrelated transaction changes', async () => {
		render(LiquidiumRepayModal, { props: { reserve } });

		await waitFor(() => expect(maxRepaySpy).toHaveBeenCalledOnce());

		activeUserTransactionsStore.upsert({ transaction: mockNearIntentsActiveUserTransaction });

		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(maxRepaySpy).toHaveBeenCalledOnce();
	});

	// Only the FIRST (pre-settlement) request is deferred, so the refetch can land before it. The
	// stale answer carries the old, larger debt: if it won, the cap would re-open to that amount.
	// Asserted on the Review button, not the error text, whose removal is animated.
	it('ignores a max response superseded by a refetch', async () => {
		let resolveStale: ((amount: bigint | null) => void) | undefined;

		maxRepaySpy
			.mockReturnValueOnce(
				new Promise((res) => {
					resolveStale = res;
				})
			)
			.mockResolvedValue(50_000_000n);

		const { getByPlaceholderText, getByTestId } = render(LiquidiumRepayModal, {
			props: { reserve }
		});

		await waitFor(() => expect(maxRepaySpy).toHaveBeenCalledOnce());

		activeUserTransactionsStore.upsert({
			transaction: { ...pendingRepay, status: { Succeeded: null } }
		});

		await waitFor(() => expect(maxRepaySpy).toHaveBeenCalledTimes(2));

		const input = getByPlaceholderText('0');

		// Control: within the fresh 0.5 ICP cap the form submits, so the cap is the only gate below.
		await fireEvent.input(input, { target: { value: '0.25' } });
		await waitFor(() =>
			expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).not.toHaveAttribute('disabled')
		);

		// 0.75 ICP: over the fresh 0.5 ICP cap, under the stale 1 ICP one.
		await fireEvent.input(input, { target: { value: '0.75' } });
		await waitFor(() => expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toHaveAttribute('disabled'));

		resolveStale?.(100_000_000n);
		await runResolvedPromises();
		await runResolvedPromises();

		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toHaveAttribute('disabled');
	});

	// The refetch is left pending so the gap it opens on an already-open Review is observable.
	it('disables Confirm on Review while a settled repay refreshes the cap', async () => {
		maxRepaySpy.mockResolvedValueOnce(100_000_000n).mockReturnValue(new Promise(() => undefined));

		const { getByPlaceholderText, getByTestId } = render(LiquidiumRepayModal, {
			props: { reserve }
		});

		await waitFor(() => expect(maxRepaySpy).toHaveBeenCalledOnce());

		await fireEvent.input(getByPlaceholderText('0'), { target: { value: '0.25' } });
		await waitFor(() =>
			expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).not.toHaveAttribute('disabled')
		);

		await fireEvent.click(getByTestId(STAKE_FORM_REVIEW_BUTTON));
		await waitFor(() =>
			expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).not.toHaveAttribute('disabled')
		);

		activeUserTransactionsStore.upsert({
			transaction: { ...pendingRepay, status: { Succeeded: null } }
		});

		await waitFor(() => expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).toHaveAttribute('disabled'));
	});

	// The debt rows follow the live portfolio, not the reserve picked when the modal opened.
	it('shows the settled debt once the portfolio refreshes', async () => {
		const { getAllByText, getByText, queryByText } = render(LiquidiumRepayModal, {
			props: { reserve }
		});

		await waitFor(() => expect(getByText('1 ICP')).toBeInTheDocument());

		liquidiumStore.set({
			markets: [],
			portfolio: {
				...portfolio,
				reserves: [{ ...reserve, borrowed: 50_000_000n, borrowedUsd: 6 }]
			},
			assetPrices: {}
		});
		activeUserTransactionsStore.upsert({
			transaction: { ...pendingRepay, status: { Succeeded: null } }
		});

		await waitFor(() => expect(queryByText('1 ICP')).toBeNull());

		// Current debt and Debt after repay (nothing typed).
		expect(getAllByText('0.5 ICP')).toHaveLength(2);
	});

	it('says the debt is unavailable when the max request fails', async () => {
		maxRepaySpy.mockRejectedValue(new Error('canister unreachable'));

		const { container } = render(LiquidiumRepayModal, { props: { reserve } });

		await waitFor(() =>
			expect(container).toHaveTextContent(en.liquidium.text.repay_debt_unavailable)
		);
	});
});
