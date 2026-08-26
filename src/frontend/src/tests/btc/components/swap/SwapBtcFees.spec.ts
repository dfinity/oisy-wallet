import SwapBtcFees from '$btc/components/swap/SwapBtcFees.svelte';
import { UTXOS_FEE_CONTEXT_KEY, initUtxosFeeStore } from '$btc/stores/utxos-fee.store';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import { SwapProvider, type SwapMappedResult } from '$lib/types/swap';
import { mockUtxosFee } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { mockNearIntentsQuoteResponse } from '$tests/mocks/near-intents.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('SwapBtcFees', () => {
	const chainFusionOffer: SwapMappedResult = {
		provider: SwapProvider.CHAIN_FUSION,
		receiveAmount: 1_000_000n,
		swapDetails: {
			sourceFees: [
				{ labelPath: 'fee.text.convert_btc_network_fee', fee: 1_000n, token: BTC_MAINNET_TOKEN }
			],
			externalFees: []
		}
	};

	const nearIntentsOffer: SwapMappedResult = {
		provider: SwapProvider.NEAR_INTENTS,
		receiveAmount: 1_000_000n,
		swapDetails: mockNearIntentsQuoteResponse,
		type: undefined
	};

	const createContext = ({
		offer,
		withUtxosFee = true
	}: {
		offer: SwapMappedResult;
		withUtxosFee?: boolean;
	}) => {
		const context = new Map();

		context.set(SWAP_CONTEXT_KEY, {
			sourceToken: readable({ ...BTC_MAINNET_TOKEN, enabled: true }),
			sourceTokenExchangeRate: readable(60_000)
		});

		const swapAmountsStore = initSwapAmountsStore();
		swapAmountsStore.setSwaps({
			swaps: [offer],
			amountForSwap: 0.01,
			selectedProvider: offer
		});
		context.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: swapAmountsStore });

		const utxosFeeStore = initUtxosFeeStore();
		if (withUtxosFee) {
			utxosFeeStore.setUtxosFee({ utxosFee: mockUtxosFee, amountForFee: 0.01 });
		}
		context.set(UTXOS_FEE_CONTEXT_KEY, { store: utxosFeeStore });

		return context;
	};

	it('renders the priced fee breakdown for a Chain Fusion offer', () => {
		const { getByText, queryByText } = render(SwapBtcFees, {
			context: createContext({ offer: chainFusionOffer })
		});

		expect(getByText(en.swap.text.total_fee)).toBeInTheDocument();
		expect(getByText(en.fee.text.convert_btc_network_fee)).toBeInTheDocument();
		expect(queryByText(en.fee.text.network_fee)).not.toBeInTheDocument();
	});

	// The NEAR Intents quote prices its own fees into the receive amount; the deposit's
	// Bitcoin network fee is the only cost paid on top, mirroring the SOL and EVM wizards.
	it('renders the Bitcoin network fee for a NEAR Intents offer', () => {
		const { getByText, queryByText } = render(SwapBtcFees, {
			context: createContext({ offer: nearIntentsOffer })
		});

		expect(getByText(en.fee.text.network_fee)).toBeInTheDocument();
		expect(queryByText(en.swap.text.total_fee)).not.toBeInTheDocument();
	});

	it('renders nothing for a NEAR Intents offer while the UTXO fee is unknown', () => {
		const { container } = render(SwapBtcFees, {
			context: createContext({ offer: nearIntentsOffer, withUtxosFee: false })
		});

		expect(container.textContent?.trim()).toBe('');
	});
});
