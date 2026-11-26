import SwapBtcFees from '$btc/components/swap/SwapBtcFees.svelte';
import { UTXOS_FEE_CONTEXT_KEY, initUtxosFeeStore } from '$btc/stores/utxos-fee.store';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import { SwapProvider, type SwapMappedResult } from '$lib/types/swap';
import { mockUtxosFee } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { mockLifiBtcLayerswapQuote } from '$tests/mocks/lifi-btc.mock';
import { mockNearIntentsQuoteResponse } from '$tests/mocks/near-intents.mock';
import { mockRiftQuote } from '$tests/mocks/rift.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('SwapBtcFees', () => {
	const chainFusionOffer: SwapMappedResult = {
		provider: SwapProvider.CHAIN_FUSION,
		receiveAmount: 1_000_000n,
		swapDetails: {
			sourceFees: [
				{
					labelPath: 'fee.text.convert_inter_network_fee',
					fee: 100n,
					token: BTC_MAINNET_TOKEN,
					deductedFromAmount: true
				},
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

	// Its own selection's fee differs from the loader's, which prices one output only.
	const lifiOffer = ({
		withSelection = true
	}: { withSelection?: boolean } = {}): SwapMappedResult => ({
		provider: SwapProvider.LIFI,
		receiveAmount: 1_000_000n,
		receiveOutMinimum: 990_000n,
		swapDetails: mockLifiBtcLayerswapQuote,
		request: {
			fromChain: 20000000000001,
			toChain: 1,
			fromToken: 'bitcoin',
			toToken: '0x0000000000000000000000000000000000000000',
			fromAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
			fromAmount: '1000000'
		},
		...(withSelection && {
			btcSelection: {
				utxosFee: { ...mockUtxosFee, feeSatoshis: 2_130n },
				outputVSizes: [43, 29, 31]
			}
		})
	});

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

	// A total of one fee is that fee, so the lone row stands on its own under its own label
	// rather than under a "Total fee" header it would only repeat.
	it('renders a lone priced fee as a single row, without a total', () => {
		const { getByText, queryByText } = render(SwapBtcFees, {
			context: createContext({ offer: chainFusionOffer })
		});

		expect(getByText(en.fee.text.convert_btc_network_fee)).toBeInTheDocument();
		expect(getByText('0.00001 BTC')).toBeInTheDocument();
		expect(queryByText(en.swap.text.total_fee)).not.toBeInTheDocument();
		expect(queryByText(en.fee.text.network_fee)).not.toBeInTheDocument();
	});

	// The KYT fee the ckBTC minter withholds is already priced into the receive amount, so the
	// provider sheet states it and this section does not — a deposit's whole cost out of
	// balance is the Bitcoin network fee alone.
	it('leaves out the fee the provider sheet discloses', () => {
		const { queryByText } = render(SwapBtcFees, {
			context: createContext({ offer: chainFusionOffer })
		});

		expect(queryByText(en.fee.text.convert_inter_network_fee)).not.toBeInTheDocument();
		expect(queryByText('0.000001 BTC')).not.toBeInTheDocument();
	});

	it('totals several priced fees under a collapsible header', () => {
		const { getByText } = render(SwapBtcFees, {
			context: createContext({
				offer: {
					...chainFusionOffer,
					swapDetails: {
						sourceFees: [
							...chainFusionOffer.swapDetails.sourceFees,
							{ labelPath: 'fee.text.fee', fee: 500n, token: BTC_MAINNET_TOKEN }
						],
						externalFees: []
					}
				}
			})
		});

		expect(getByText(en.swap.text.total_fee)).toBeInTheDocument();
		expect(getByText('0.000015 BTC')).toBeInTheDocument();
		expect(getByText(en.fee.text.convert_btc_network_fee)).toBeInTheDocument();
		expect(getByText(en.fee.text.fee)).toBeInTheDocument();
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

	// LI.FI's and the bridge's fees come out of the amount and are in the provider sheet; the network
	// fee is its own selection's, priced for its deposit, memo and fee outputs, not the loader's.
	it("renders the Bitcoin network fee of a LI.FI offer's own selection", () => {
		const { getByText, queryByText } = render(SwapBtcFees, {
			context: createContext({ offer: lifiOffer() })
		});

		expect(getByText(en.fee.text.network_fee)).toBeInTheDocument();
		expect(getByText('0.0000213 BTC')).toBeInTheDocument();
		expect(queryByText('0.00001 BTC')).not.toBeInTheDocument();
	});

	it('renders nothing for a LI.FI offer without its selection, rather than the loader fee', () => {
		const { container } = render(SwapBtcFees, {
			context: createContext({ offer: lifiOffer({ withSelection: false }) })
		});

		expect(container.textContent?.trim()).toBe('');
	});

	// A Rift deposit is a plain transfer, priced by the loader; Rift's delivery cost comes out of the
	// estimate and is in the provider sheet.
	it('renders the Bitcoin network fee for a Rift offer', () => {
		const riftOffer: SwapMappedResult = {
			provider: SwapProvider.RIFT,
			receiveAmount: 121_475_958n,
			swapDetails: mockRiftQuote
		};

		const { getByText, queryByText } = render(SwapBtcFees, {
			context: createContext({ offer: riftOffer })
		});

		expect(getByText(en.fee.text.network_fee)).toBeInTheDocument();
		expect(getByText('0.00001 BTC')).toBeInTheDocument();
		expect(queryByText(en.swap.text.total_fee)).not.toBeInTheDocument();
	});

	it('renders nothing for a NEAR Intents offer while the UTXO fee is unknown', () => {
		const { container } = render(SwapBtcFees, {
			context: createContext({ offer: nearIntentsOffer, withUtxosFee: false })
		});

		expect(container.textContent?.trim()).toBe('');
	});
});
