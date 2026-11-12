import { ONRAMPER_API_KEY, ONRAMPER_API_URL } from '$env/rest/onramper.env';
import { ONRAMPER_SUPPORTED_TIMEOUT_MS } from '$lib/constants/onramper.constants';
import {
	OnramperSupportedCryptoSchema,
	OnramperSupportedResponseSchema
} from '$lib/schema/onramper.schema';
import type { OnramperSupportedCrypto, OnramperTransactionType } from '$lib/types/onramper';
import { isNullish } from '@dfinity/utils';

/**
 * Fetch OnRamper's list of the tokens it supports for buying or for selling, from every country.
 *
 * https://docs.onramper.com/reference/get_supported
 *
 * The request carries the widget's public API key, never anything about the user. OnRamper filters
 * the list neither by network nor by address, so the whole list comes back.
 *
 * @param params - The parameters of the request.
 * @param params.type - The list to fetch: the tokens OnRamper buys or the ones it sells.
 * @returns The tokens of the list. A malformed token is left out.
 * @throws If there is no API key, the request fails, or the response is not a list of tokens.
 */
export const fetchOnramperSupportedCryptos = async ({
	type
}: {
	type: OnramperTransactionType;
}): Promise<OnramperSupportedCrypto[]> => {
	const apiKey: string | undefined = ONRAMPER_API_KEY;

	// Without a key OnRamper answers with empty lists rather than an error.
	if (isNullish(apiKey)) {
		throw new Error('No OnRamper API key.');
	}

	const url = new URL('/supported', ONRAMPER_API_URL);
	url.searchParams.set('type', type);
	url.searchParams.set('skipCountryCheck', 'true');

	const response = await fetch(url, {
		headers: { Authorization: apiKey },
		signal: AbortSignal.timeout(ONRAMPER_SUPPORTED_TIMEOUT_MS)
	});

	if (!response.ok) {
		throw new Error(`Fetching the OnRamper ${type} list failed with status ${response.status}.`);
	}

	const parsed = OnramperSupportedResponseSchema.safeParse(await response.json());

	if (!parsed.success) {
		throw new Error(`Invalid OnRamper ${type} list.`);
	}

	return parsed.data.message.crypto.flatMap((entry) => {
		const crypto = OnramperSupportedCryptoSchema.safeParse(entry);
		return crypto.success ? [crypto.data] : [];
	});
};
