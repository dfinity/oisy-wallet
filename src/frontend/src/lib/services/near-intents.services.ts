import { NEAR_INTENTS_SWAP_ENABLED } from '$env/rest/near-intents.env';
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
import { NEAR_INTENTS_TERMINAL_STATUSES, type NearIntentsToken } from '$lib/types/near-intents';
import type { NearIntentsQuoteParams, SwapMappedResult } from '$lib/types/swap';
import {
	buildNearIntentsQuoteRequest,
	mapNearIntentsQuoteResult,
	resolveNearIntentsSwapAssets
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
	userAddress,
	recipientAddress,
	slippage
}: NearIntentsQuoteParams): Promise<SwapMappedResult | undefined> => {
	if (!NEAR_INTENTS_SWAP_ENABLED || isNullish(userAddress)) {
		return;
	}

	const nearTokens = await loadNearIntentsTokens();

	const assets = resolveNearIntentsSwapAssets({ nearTokens, sourceToken, destinationToken });

	if (isNullish(assets)) {
		return;
	}

	const quoteResponse = await fetchNearIntentsQuote(
		buildNearIntentsQuoteRequest({
			slippageTolerance: Math.round(Number(slippage) * 100),
			...assets,
			amount,
			userAddress,
			recipientAddress,
			deadlineMs: NEAR_INTENTS_QUOTE_DEADLINE_MS
		})
	);

	return mapNearIntentsQuoteResult(quoteResponse);
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
			depositMemo
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
