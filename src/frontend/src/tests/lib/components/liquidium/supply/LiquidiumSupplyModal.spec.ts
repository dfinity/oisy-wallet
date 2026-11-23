import type { EthAddress, OptionEthAddress } from '$eth/types/address';
import LiquidiumSupplyModal from '$lib/components/liquidium/supply/LiquidiumSupplyModal.svelte';
import * as addressesStore from '$lib/derived/address.derived';
import * as liquidiumSupplyServices from '$lib/services/liquidium-supply.services';
import type { LiquidiumMarket } from '$lib/types/liquidium';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { runResolvedPromises } from '$tests/utils/timers.test-utils';
import type { InflowFeeEstimate } from '@liquidium/client';
import { render, waitFor } from '@testing-library/svelte';
import { readable, writable, type Writable } from 'svelte/store';

vi.mock('$sol/api/solana.api', () => ({
	estimatePriorityFee: vi.fn().mockResolvedValue(1_000_000n)
}));

describe('LiquidiumSupplyModal', () => {
	const market: LiquidiumMarket = {
		poolId: 'pool-icp',
		asset: 'ICP',
		chain: 'ICP',
		supplyApy: 6,
		borrowApy: 10,
		frozen: false,
		available: true
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();
		vi.spyOn(addressesStore, 'ethAddress', 'get').mockImplementation(() =>
			readable(mockEthAddress)
		);

		vi.spyOn(liquidiumSupplyServices, 'estimateLiquidiumInflowFee').mockResolvedValue({
			totalFee: 50_000n
		});
	});

	it("quotes the provider fee for the market's pool as a deposit", async () => {
		render(LiquidiumSupplyModal, { props: { market } });

		await waitFor(() =>
			expect(liquidiumSupplyServices.estimateLiquidiumInflowFee).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				ethAddress: mockEthAddress,
				asset: market.asset,
				chain: market.chain,
				poolId: market.poolId,
				action: 'deposit'
			})
		);
	});

	// The quote's minimum is the only guard on a native SOL supply: the SDK's static SOL minimum is
	// zero, so without it the form would accept an amount Liquidium never credits.
	it("shows the SOL quote's minimum, net of its fee, on a native SOL market", async () => {
		vi.spyOn(addressesStore, 'solAddressMainnet', 'get').mockImplementation(() =>
			readable(mockSolAddress)
		);
		vi.mocked(liquidiumSupplyServices.estimateLiquidiumInflowFee).mockResolvedValue({
			totalFee: 1_884_122n,
			minimumSendAmount: 20_000_000n
		});

		const { container } = render(LiquidiumSupplyModal, {
			props: {
				market: { ...market, poolId: 'pool-sol', asset: 'SOL', chain: 'SOL' }
			}
		});

		await waitFor(() => expect(container).toHaveTextContent(en.liquidium.text.minimum_supply));

		expect(container).toHaveTextContent('0.018115878 SOL');
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
			const { container } = render(LiquidiumSupplyModal, { props: { market } });

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
			expect(container).not.toHaveTextContent(en.liquidium.text.supply_prices_unavailable);
		});
	});
});
