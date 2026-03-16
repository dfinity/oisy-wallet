import { NEAR_INTENTS_SWAP_ENABLED } from '$env/rest/near-intents.env';
import type { Erc20Token } from '$eth/types/erc20';
import {
	NEAR_INTENTS_POLL_INTERVAL_MS,
	NEAR_INTENTS_POLL_MAX_ATTEMPTS,
	NEAR_INTENTS_QUOTE_DEADLINE_MS
} from '$lib/constants/swap.constants';
import {
	fetchNearIntentsQuote,
	fetchNearIntentsStatus,
	fetchNearIntentsTokens,
	submitNearIntentsDeposit
} from '$lib/rest/near-intents.rest';
import {
	NEAR_INTENTS_TERMINAL_STATUSES,
	type NearIntentsQuoteResponse,
	type NearIntentsToken
} from '$lib/types/near-intents';
import type { EvmQuoteParams, SwapMappedResult } from '$lib/types/swap';
import {
	findNearIntentsAsset,
	mapNearIntentsQuoteResult,
	resolveNearIntentsBlockchain
} from '$lib/utils/swap.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

let cachedTokens: NearIntentsToken[] | undefined = undefined;

export const loadNearIntentsTokens = async (): Promise<NearIntentsToken[]> => {
	if (nonNullish(cachedTokens)) {
		return cachedTokens;
	}

	cachedTokens = await fetchNearIntentsTokens();

	return cachedTokens;
};

export const clearNearIntentsTokensCache = (): void => {
	cachedTokens = undefined;
};

export const fetchNearIntentsSwapQuote = async ({
	sourceToken,
	destinationToken,
	amount,
	userEthAddress
}: EvmQuoteParams): Promise<SwapMappedResult | null> => {
	if (!NEAR_INTENTS_SWAP_ENABLED || isNullish(userEthAddress)) {
		return null;
	}

	const nearTokens = await loadNearIntentsTokens();

	const srcBlockchain = resolveNearIntentsBlockchain(sourceToken.network.name);
	const destBlockchain = resolveNearIntentsBlockchain(destinationToken.network.name);

	if (isNullish(srcBlockchain) || isNullish(destBlockchain)) {
		return null;
	}

	const srcAsset = findNearIntentsAsset({
		tokens: nearTokens,
		token: sourceToken,
		blockchain: srcBlockchain
	});

	const destAsset = findNearIntentsAsset({
		tokens: nearTokens,
		token: destinationToken,
		blockchain: destBlockchain
	});

	if (isNullish(srcAsset) || isNullish(destAsset)) {
		return null;
	}

	const quoteResponse = await fetchNearIntentsQuote({
		dry: true,
		swapType: 'EXACT_INPUT',
		slippageTolerance: 100,
		originAsset: srcAsset.assetId,
		destinationAsset: destAsset.assetId,
		amount: amount.toString(),
		recipient: userEthAddress,
		refundTo: userEthAddress,
		deadline: new Date(Date.now() + NEAR_INTENTS_QUOTE_DEADLINE_MS).toISOString()
	});

	return mapNearIntentsQuoteResult(quoteResponse);
};

export const executeNearIntentsSwap = async ({
	sourceToken,
	destinationToken,
	amount,
	userEthAddress,
	slippageTolerance
}: {
	sourceToken: Erc20Token;
	destinationToken: Erc20Token;
	amount: bigint;
	userEthAddress: string;
	slippageTolerance: number;
}): Promise<NearIntentsQuoteResponse> => {
	const nearTokens = await loadNearIntentsTokens();

	const srcBlockchain = resolveNearIntentsBlockchain(sourceToken.network.name);
	const destBlockchain = resolveNearIntentsBlockchain(destinationToken.network.name);

	if (isNullish(srcBlockchain) || isNullish(destBlockchain)) {
		throw new Error('Unsupported blockchain for NEAR Intents swap');
	}

	const srcAsset = findNearIntentsAsset({
		tokens: nearTokens,
		token: sourceToken,
		blockchain: srcBlockchain
	});

	const destAsset = findNearIntentsAsset({
		tokens: nearTokens,
		token: destinationToken,
		blockchain: destBlockchain
	});

	if (isNullish(srcAsset) || isNullish(destAsset)) {
		throw new Error('Token not supported by NEAR Intents');
	}

	return fetchNearIntentsQuote({
		dry: false,
		swapType: 'EXACT_INPUT',
		slippageTolerance,
		originAsset: srcAsset.assetId,
		destinationAsset: destAsset.assetId,
		amount: amount.toString(),
		recipient: userEthAddress,
		refundTo: userEthAddress,
		deadline: new Date(Date.now() + NEAR_INTENTS_QUOTE_DEADLINE_MS).toISOString()
	});
};

export const submitNearIntentsDepositTx = async ({
	depositAddress,
	txHash,
	depositMemo
}: {
	depositAddress: string;
	txHash: string;
	depositMemo?: string;
}): Promise<void> => {
	await submitNearIntentsDeposit({
		txHash,
		depositAddress,
		...(depositMemo ? { memo: depositMemo } : {})
	});
};

export const pollNearIntentsStatus = async ({
	depositAddress,
	depositMemo
}: {
	depositAddress: string;
	depositMemo?: string;
}): Promise<void> => {
	for (let i = 0; i < NEAR_INTENTS_POLL_MAX_ATTEMPTS; i++) {
		const { status } = await fetchNearIntentsStatus({
			depositAddress,
			depositMemo: depositMemo ?? undefined
		});

		if (NEAR_INTENTS_TERMINAL_STATUSES.includes(status)) {
			if (status === 'SUCCESS') {
				return;
			}

			throw new Error(`NEAR Intents swap ${status.toLowerCase()}`);
		}

		await new Promise((r) => setTimeout(r, NEAR_INTENTS_POLL_INTERVAL_MS));
	}

	throw new Error('NEAR Intents swap timed out');
};
