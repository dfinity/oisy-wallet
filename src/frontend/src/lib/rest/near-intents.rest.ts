import { NEAR_INTENTS_API_URL } from '$env/rest/near-intents.env';
import type {
	NearIntentsDepositSubmitRequest,
	NearIntentsQuoteRequest,
	NearIntentsQuoteResponse,
	NearIntentsStatusResponse,
	NearIntentsToken
} from '$lib/types/near-intents';
import { nonNullish } from '@dfinity/utils';

const buildHeaders = (): HeadersInit =>
	// Apparently we do not need an API keys for Near Intents, we can do unauthorised calls
	// if (isEmptyString(NEAR_INTENTS_API_KEY)) {
	// 	throw new Error('No Near Intents API key provided.');
	// }

	({
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

		throw new Error(`NEAR Intents quote failed: ${error.message ?? response.statusText}`);
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
