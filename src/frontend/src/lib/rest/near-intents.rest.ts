import { NEAR_INTENTS_API_URL } from '$env/rest/near-intents.env';
import { SwapAmountTooLowError } from '$lib/types/errors';
import type {
	NearIntentsDepositSubmitRequest,
	NearIntentsQuoteRequest,
	NearIntentsQuoteResponse,
	NearIntentsStatusResponse,
	NearIntentsToken
} from '$lib/types/near-intents';
import { isNullish, nonNullish } from '@dfinity/utils';

const buildHeaders = (): HeadersInit => ({
	'Content-Type': 'application/json'
	// Apparently we do not need an API keys for Near Intents, we can do unauthorised calls
	// Authorization: `Bearer ${NEAR_INTENTS_API_KEY}`
});

// https://docs.near-intents.org/api-reference/oneclick/get-supported-tokens
export const fetchNearIntentsTokens = async (): Promise<NearIntentsToken[]> => {
	const response = await fetch(`${NEAR_INTENTS_API_URL}/tokens`);

	if (!response.ok) {
		throw new Error(`Failed to fetch NEAR Intents tokens: ${response.statusText}`);
	}

	return response.json();
};

// 1Click rejects a too-small amount with a 400 whose message reads e.g.
// "Amount is too low for bridge, try at least 8300", the minimum being in the
// origin asset's smallest unit (the same unit as the request's `amount`).
const AMOUNT_TOO_LOW_PATTERN = /amount is too low/i;
const AMOUNT_TOO_LOW_MINIMUM_PATTERN = /try at least (\d+)/i;

// A second, unrelated refusal: 1Click caps some chains (Polygon and BSC at the time of
// writing, on either side of the route) below a fiat floor, with a 400 reading
// "Temporary swap limits: minimum swap amount is $1,000". The figure is USD, not token
// units, and the API exposes it nowhere structured, so the message is the only source.
// Matched on the part that states the constraint rather than on "Temporary swap limits":
// the wording of the preamble, the amount and the affected chains are all volatile.
const MINIMUM_SWAP_AMOUNT_PATTERN = /minimum swap amount/i;
const MINIMUM_SWAP_AMOUNT_FIGURE_PATTERN = /minimum swap amount is\s*\$\s*([\d,]+(?:\.\d+)?)/i;

const parseUsdMinimum = (message: string): number | undefined => {
	const matched = MINIMUM_SWAP_AMOUNT_FIGURE_PATTERN.exec(message)?.[1];

	if (isNullish(matched)) {
		return;
	}

	const parsed = Number(matched.replace(/,/g, ''));

	// A separator-only capture parses as 0, which would advertise a minimum of nothing.
	return !isFinite(parsed) || parsed <= 0 ? undefined : parsed;
};

// https://docs.near-intents.org/api-reference/oneclick/request-a-swap-quote
export const fetchNearIntentsQuote = async (
	request: NearIntentsQuoteRequest
): Promise<NearIntentsQuoteResponse> => {
	const response = await fetch(`${NEAR_INTENTS_API_URL}/quote`, {
		method: 'POST',
		headers: buildHeaders(),
		body: JSON.stringify(request)
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: response.statusText }));

		const message: string = error.message ?? response.statusText;

		if (AMOUNT_TOO_LOW_PATTERN.test(message)) {
			const minAmount = AMOUNT_TOO_LOW_MINIMUM_PATTERN.exec(message)?.[1];

			throw new SwapAmountTooLowError(
				`NEAR Intents quote failed: ${message}`,
				nonNullish(minAmount) ? { type: 'token', value: BigInt(minAmount) } : undefined
			);
		}

		if (MINIMUM_SWAP_AMOUNT_PATTERN.test(message)) {
			const usdMinimum = parseUsdMinimum(message);

			throw new SwapAmountTooLowError(
				`NEAR Intents quote failed: ${message}`,
				nonNullish(usdMinimum) ? { type: 'usd', value: usdMinimum } : undefined
			);
		}

		throw new Error(`NEAR Intents quote failed: ${message}`);
	}

	return response.json();
};

// https://docs.near-intents.org/api-reference/oneclick/check-swap-execution-status
export const fetchNearIntentsStatus = async ({
	depositAddress,
	depositMemo
}: {
	depositAddress: string;
	depositMemo?: string;
}): Promise<NearIntentsStatusResponse> => {
	const params = new URLSearchParams({ depositAddress });

	if (nonNullish(depositMemo)) {
		params.set('depositMemo', depositMemo);
	}

	const response = await fetch(`${NEAR_INTENTS_API_URL}/status?${params.toString()}`, {
		headers: buildHeaders()
	});

	if (!response.ok) {
		throw new Error(`NEAR Intents status check failed: ${response.statusText}`);
	}

	return response.json();
};

// https://docs.near-intents.org/api-reference/oneclick/submit-deposit-transaction-hash
export const submitNearIntentsDeposit = async (
	request: NearIntentsDepositSubmitRequest
): Promise<NearIntentsStatusResponse> => {
	const response = await fetch(`${NEAR_INTENTS_API_URL}/deposit/submit`, {
		method: 'POST',
		headers: buildHeaders(),
		body: JSON.stringify(request)
	});

	if (!response.ok) {
		throw new Error(`NEAR Intents deposit submit failed: ${response.statusText}`);
	}

	return response.json();
};
