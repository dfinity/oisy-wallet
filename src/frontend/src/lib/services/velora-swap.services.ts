import type { Erc20Token } from '$eth/types/erc20';
import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
import { OISY_URL_HOSTNAME } from '$lib/constants/oisy.constants';
import { SWAP_MODE, SWAP_MODE_MARKET, SWAP_SIDE } from '$lib/constants/swap.constants';
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
import { isNetworkEthereum } from '$lib/utils/network.utils';
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
	userAddress
}: EvmQuoteParams): Promise<SwapMappedResult | undefined> => {
	if (isNullish(userAddress) || !isNetworkEthereum(destinationToken.network)) {
		return;
	}

	const erc20DestinationToken = destinationToken as Erc20Token;

	const {
		network: { chainId: destChainId }
	} = erc20DestinationToken;

	const {
		network: { chainId: srcChainId }
	} = sourceToken;

	const sdk = constructSimpleSDK({
		chainId: Number(srcChainId),
		fetch: window.fetch
	});

	// Velora Delta settles by pulling the source token via allowance/permit, which is
	// impossible for a native coin (no ERC-20 contract). Velora still returns Delta pricing
	// for native sources, but executing it would require the on-chain DepositNativeAndPreSign
	// flow we don't implement — the Delta path would crash trying to approve a native coin.
	// Force native sources onto the Market route, which signs a standard swap transaction
	// carrying the native value.
	const mode = isDefaultEthereumToken(sourceToken) ? SWAP_MODE_MARKET : SWAP_MODE;

	const baseParams: GetQuoteParams = {
		amount: `${amount}`,
		srcToken: geSwapEthTokenAddress(sourceToken),
		destToken: geSwapEthTokenAddress(erc20DestinationToken),
		srcDecimals: sourceToken.decimals,
		destDecimals: destinationToken.decimals,
		mode,
		side: SWAP_SIDE,
		userAddress,
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
		token2_address: erc20DestinationToken.address,
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
