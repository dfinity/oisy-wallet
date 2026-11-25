import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import * as ethTransactionsDerived from '$eth/derived/eth-transactions.derived';
import { SEND_FIRST_TIME_DESTINATION_CONFIRM } from '$lib/constants/test-ids.constants';
import * as addressDerived from '$lib/derived/address.derived';
import { initSwapAmountsStore, SWAP_AMOUNTS_CONTEXT_KEY } from '$lib/stores/swap-amounts.store';
import { initSwapContext, SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import { SwapProvider, type SwapMappedResult } from '$lib/types/swap';
import type { KnownDestinations } from '$lib/types/transactions';
import SwapReviewDestinationTestHost from '$tests/lib/components/swap/SwapReviewDestinationTestHost.svelte';
import { mockEthAddress, mockEthAddress2 } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockNearIntentsQuoteResponse } from '$tests/mocks/near-intents.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

const nearIntentsOfferPaying = (recipient: string): SwapMappedResult => ({
	provider: SwapProvider.NEAR_INTENTS,
	receiveAmount: 900_000n,
	receiveOutMinimum: 890_000n,
	swapDetails: {
		...mockNearIntentsQuoteResponse,
		quoteRequest: { ...mockNearIntentsQuoteResponse.quoteRequest, recipient }
	}
});

describe('SwapReviewDestination', () => {
	const setup = ({
		offer,
		customDestination
	}: {
		offer: SwapMappedResult;
		customDestination?: string;
	}) => {
		const swapContext = initSwapContext({ sourceToken: ICP_TOKEN, destinationToken: PEPE_TOKEN });
		const store = initSwapAmountsStore();

		swapContext.setCustomDestination(customDestination);
		store.setSwaps({ swaps: [offer], selectedProvider: offer, amountForSwap: '1' });

		return new Map<symbol, unknown>([
			[SWAP_CONTEXT_KEY, swapContext],
			[SWAP_AMOUNTS_CONTEXT_KEY, { store }]
		]);
	};

	const mockKnownDestinations = (knownDestinations: KnownDestinations) =>
		vi
			.spyOn(ethTransactionsDerived, 'ethKnownDestinations', 'get')
			.mockImplementation(() => readable(knownDestinations));

	beforeEach(() => {
		vi.spyOn(addressDerived, 'ethAddress', 'get').mockImplementation(() =>
			readable(mockEthAddress)
		);

		mockKnownDestinations({});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('shows "Your OISY Wallet" for a quote paying the user', () => {
		const context = setup({ offer: nearIntentsOfferPaying(mockEthAddress) });

		const { getByText, getByTestId, queryByTestId } = render(SwapReviewDestinationTestHost, {
			context
		});

		expect(getByText(en.convert.text.default_destination)).toBeInTheDocument();
		expect(queryByTestId(SEND_FIRST_TIME_DESTINATION_CONFIRM)).not.toBeInTheDocument();
		expect(getByTestId('swap-blocked')).toHaveTextContent('false');
	});

	it('shows the full address the quote pays, held back until a first-time address is confirmed', async () => {
		const context = setup({
			offer: nearIntentsOfferPaying(mockEthAddress2),
			customDestination: mockEthAddress2
		});

		const { getByText, getByTestId } = render(SwapReviewDestinationTestHost, { context });

		expect(getByText(mockEthAddress2)).toBeInTheDocument();
		expect(getByTestId('swap-blocked')).toHaveTextContent('true');

		await fireEvent.click(getByTestId(SEND_FIRST_TIME_DESTINATION_CONFIRM));

		expect(getByTestId('swap-blocked')).toHaveTextContent('false');
	});

	it('does not warn about an address the wallet has sent to', () => {
		mockKnownDestinations({ [mockEthAddress2]: { amounts: [], address: mockEthAddress2 } });

		const context = setup({
			offer: nearIntentsOfferPaying(mockEthAddress2),
			customDestination: mockEthAddress2
		});

		const { getByTestId, queryByTestId } = render(SwapReviewDestinationTestHost, { context });

		expect(queryByTestId(SEND_FIRST_TIME_DESTINATION_CONFIRM)).not.toBeInTheDocument();
		expect(getByTestId('swap-blocked')).toHaveTextContent('false');
	});

	it('holds the swap back when the quote pays another address than the one chosen', () => {
		const context = setup({
			offer: nearIntentsOfferPaying(mockEthAddress),
			customDestination: mockEthAddress2
		});

		const { getByText, getByTestId } = render(SwapReviewDestinationTestHost, { context });

		expect(getByText(en.convert.text.default_destination)).toBeInTheDocument();
		expect(getByTestId('swap-blocked')).toHaveTextContent('true');
	});

	it('shows nothing for another provider', () => {
		const icpSwapOffer: SwapMappedResult = {
			provider: SwapProvider.ICP_SWAP,
			receiveAmount: 950_000n,
			receiveOutMinimum: 940_000n,
			swapDetails: { receiveAmount: 950_000n }
		};

		const context = setup({ offer: icpSwapOffer });

		const { queryByText, getByTestId } = render(SwapReviewDestinationTestHost, { context });

		expect(queryByText(en.convert.text.default_destination)).not.toBeInTheDocument();
		expect(getByTestId('swap-blocked')).toHaveTextContent('false');
	});
});
