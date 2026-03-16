import { OISY_URL_HOSTNAME } from '$lib/constants/oisy.constants';
import { SWAP_MODE, SWAP_SIDE } from '$lib/constants/swap.constants';
import { exchanges } from '$lib/derived/exchange.derived';
import { PLAUSIBLE_EVENTS, PLAUSIBLE_EVENT_CONTEXTS } from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import {
	SwapProvider,
	type EvmQuoteParams,
	type GetQuoteParams,
	type SwapMappedResult
} from '$lib/types/swap';
import { formatToken } from '$lib/utils/format.utils';
import {
	geSwapEthTokenAddress,
	mapVeloraMarketSwapResult,
	mapVeloraSwapResult
} from '$lib/utils/swap.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { constructSimpleSDK } from '@velora-dex/sdk';
import { get } from 'svelte/store';

export const fetchVeloraSwapAmount = async ({
	sourceToken,
	destinationToken,
	amount,
	userEthAddress
}: EvmQuoteParams): Promise<SwapMappedResult | undefined> => {
	if (isNullish(userEthAddress)) {
		return;
	}

	const {
		network: { chainId: destChainId }
	} = destinationToken;

	const {
		network: { chainId: srcChainId }
	} = sourceToken;

	const sdk = constructSimpleSDK({
		chainId: Number(srcChainId),
		fetch: window.fetch
	});

	const baseParams: GetQuoteParams = {
		amount: `${amount}`,
		srcToken: geSwapEthTokenAddress(sourceToken),
		destToken: geSwapEthTokenAddress(destinationToken),
		srcDecimals: sourceToken.decimals,
		destDecimals: destinationToken.decimals,
		mode: SWAP_MODE,
		side: SWAP_SIDE,
		userAddress: userEthAddress,
		partner: OISY_URL_HOSTNAME
	};

	const sourceTokenUsdValue = get(exchanges)?.[sourceToken.id]?.usd;
	const sourceTokenToDecimals = formatToken({
		value: amount,
		unitName: sourceToken.decimals
	});

	const trackEventBaseParams = {
		event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
		event_subcontext: SwapProvider.VELORA,
		token_symbol: sourceToken.symbol,
		token_network: sourceToken.network.name,
		token_address: sourceToken.address,
		token_name: sourceToken.name,
		token_standard: sourceToken.standard.code,
		token_id: String(sourceToken.id),
		token2_symbol: destinationToken.symbol,
		token2_network: destinationToken.network.name,
		token2_address: destinationToken.address,
		token2_name: destinationToken.name,
		token2_standard: destinationToken.standard.code,
		token2_id: String(destinationToken.id),
		...(nonNullish(sourceTokenUsdValue) && {
			token_usd_value: `${sourceTokenUsdValue * Number(sourceTokenToDecimals)}`
		})
	};

	try {
		const data = await sdk.quote.getQuote(
			srcChainId !== destChainId ? { ...baseParams, destChainId: Number(destChainId) } : baseParams
		);

		const destinationUsdValue = get(exchanges)?.[destinationToken.id]?.usd;

		if ('delta' in data) {
			const destinationTokenToDecimals = formatToken({
				value: BigInt(data.delta.destAmount),
				unitName: destinationToken.decimals
			});

			trackEvent({
				name: PLAUSIBLE_EVENTS.SWAP_OFFER,
				metadata: {
					...trackEventBaseParams,
					result_status: 'success',
					event_type: 'delta',
					...(nonNullish(destinationUsdValue) && {
						token2_usd_value: `${destinationUsdValue * Number(destinationTokenToDecimals)}`
					})
				}
			});
			return mapVeloraSwapResult(data);
		}

		if ('market' in data) {
			const destinationTokenToDecimals = formatToken({
				value: BigInt(data.market.destAmount),
				unitName: destinationToken.decimals
			});

			trackEvent({
				name: PLAUSIBLE_EVENTS.SWAP_OFFER,
				metadata: {
					...trackEventBaseParams,
					result_status: 'success',
					event_type: 'market',
					...(nonNullish(destinationUsdValue) && {
						token2_usd_value: `${destinationUsdValue * Number(destinationTokenToDecimals)}`
					})
				}
			});
			return mapVeloraMarketSwapResult(data.market);
		}
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		trackEvent({
			name: PLAUSIBLE_EVENTS.SWAP_OFFER,
			metadata: {
				...trackEventBaseParams,
				result_status: 'error',
				result_error: errorMessage
			}
		});
	}
};
