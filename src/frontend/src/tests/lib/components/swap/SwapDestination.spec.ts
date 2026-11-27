import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import SwapDestination from '$lib/components/swap/SwapDestination.svelte';
import {
	SWAP_DESTINATION,
	SWAP_DESTINATION_CHANGE,
	SWAP_DESTINATION_RESET
} from '$lib/constants/test-ids.constants';
import { initSwapAmountsStore, SWAP_AMOUNTS_CONTEXT_KEY } from '$lib/stores/swap-amounts.store';
import { SWAP_DESTINATION_PICKER_CONTEXT_KEY } from '$lib/stores/swap-destination-picker.store';
import { initSwapContext, SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import { SwapProvider, type SwapMappedResult } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { mockEthAddress2 } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockNearIntentsQuoteResponse } from '$tests/mocks/near-intents.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

const nearIntentsOffer: SwapMappedResult = {
	provider: SwapProvider.NEAR_INTENTS,
	receiveAmount: 900_000n,
	receiveOutMinimum: 890_000n,
	swapDetails: mockNearIntentsQuoteResponse
};

const icpSwapOffer: SwapMappedResult = {
	provider: SwapProvider.ICP_SWAP,
	receiveAmount: 950_000n,
	receiveOutMinimum: 940_000n,
	swapDetails: { receiveAmount: 950_000n }
};

describe('SwapDestination', () => {
	const showDestinationPicker = vi.fn();

	const setup = ({
		destinationToken = PEPE_TOKEN,
		offer = nearIntentsOffer,
		withPicker = true
	}: {
		destinationToken?: Token;
		offer?: SwapMappedResult;
		withPicker?: boolean;
	} = {}) => {
		const swapContext = initSwapContext({ sourceToken: ICP_TOKEN, destinationToken });
		const store = initSwapAmountsStore();

		store.setSwaps({ swaps: [offer], selectedProvider: offer, amountForSwap: '1' });

		const context = new Map<symbol, unknown>([
			[SWAP_CONTEXT_KEY, swapContext],
			[SWAP_AMOUNTS_CONTEXT_KEY, { store }],
			...(withPicker
				? [[SWAP_DESTINATION_PICKER_CONTEXT_KEY, { showDestinationPicker }] as [symbol, unknown]]
				: [])
		]);

		return { swapContext, store, context };
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('shows "Your OISY Wallet" with Change for a NEAR Intents offer', async () => {
		const { context } = setup();

		const { getByTestId, getByText } = render(SwapDestination, { context });

		expect(getByTestId(SWAP_DESTINATION)).toBeInTheDocument();
		expect(getByText(en.convert.text.default_destination)).toBeInTheDocument();

		await fireEvent.click(getByTestId(SWAP_DESTINATION_CHANGE));

		expect(showDestinationPicker).toHaveBeenCalledOnce();
	});

	it('shows no row for another provider while no address is set', () => {
		const { context } = setup({ offer: icpSwapOffer });

		const { queryByTestId } = render(SwapDestination, { context });

		expect(queryByTestId(SWAP_DESTINATION)).not.toBeInTheDocument();
	});

	it('shows no row for an XRP receive token', () => {
		const { context } = setup({ destinationToken: XRP_TOKEN });

		const { queryByTestId } = render(SwapDestination, { context });

		expect(queryByTestId(SWAP_DESTINATION)).not.toBeInTheDocument();
	});

	it('shows no row outside the swap wizard', () => {
		const { context } = setup({ withPicker: false });

		const { queryByTestId } = render(SwapDestination, { context });

		expect(queryByTestId(SWAP_DESTINATION)).not.toBeInTheDocument();
	});

	it('shows the picked address, and goes back to "Your OISY Wallet" when cleared', async () => {
		const { context, swapContext } = setup();

		swapContext.setCustomDestination(mockEthAddress2);

		const { getByTestId, getByText, queryByTestId } = render(SwapDestination, { context });

		expect(getByText(shortenWithMiddleEllipsis({ text: mockEthAddress2 }))).toBeInTheDocument();

		await fireEvent.click(getByTestId(SWAP_DESTINATION_RESET));

		expect(get(swapContext.customDestination)).toBeUndefined();
		expect(getByText(en.convert.text.default_destination)).toBeInTheDocument();
		expect(queryByTestId(SWAP_DESTINATION_RESET)).not.toBeInTheDocument();
	});

	it('keeps the row with a picked address while there is no offer', () => {
		const { context, swapContext, store } = setup();

		swapContext.setCustomDestination(mockEthAddress2);
		store.setSwaps({ swaps: [], selectedProvider: undefined, amountForSwap: '1' });

		const { getByTestId } = render(SwapDestination, { context });

		expect(getByTestId(SWAP_DESTINATION)).toBeInTheDocument();
		expect(getByTestId(SWAP_DESTINATION_RESET)).toBeInTheDocument();
	});
});
