import type { EthereumNetwork } from '$eth/types/network';
import { isTokenIcrc } from '$icp/utils/icrc.utils';
import type { Token } from '$lib/types/token';
import { isNullish, nonNullish } from '@dfinity/utils';

interface GenerateUrnParams {
	token: Token;
	destination: string;
	params?: { [key: string]: string | number | undefined };
}

// This function is used to test the function decodeUrn, looping through tokens in the token store.
// Ideally, we would have an external API or QR generator, so that the tests are consistent with the proper usage outside the app.
export const generateUrn = ({
	token,
	destination,
	params = {}
}: GenerateUrnParams): string | undefined => {
	let urn: string;

	const { name, standard, network } = token;
	const tokenAddress: string | undefined =
		'address' in token ? (token.address as string) : undefined;

	if (standard === 'erc20' && isNullish(tokenAddress)) {
		return undefined;
	}

	const prefix =
		standard === 'erc20' ? 'ethereum' : isTokenIcrc(token) ? name.toLowerCase() : standard;

	urn = `${prefix}:${destination}`;

	if (standard === 'ethereum' || standard === 'erc20') {
		urn += nonNullish(network) ? `@${(network as EthereumNetwork).chainId.toString()}` : '';
	}

	if (standard === 'erc20') {
		urn += `/transfer`;
		params.address = destination;
		params.destination = tokenAddress;
	}

	const queryString = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined) {
			queryString.append(key, value.toString());
		}
	}

	if (queryString.toString()) {
		urn += `?${queryString.toString()}`;
	}

	return urn;
};
