import { COINGECKO_ETHEREUM_NETWORK_ID } from '$lib/constants/coingecko.constants';
import { DEFAULT_CURRENCY } from '$lib/constants/tokens.constants';
import type { TokenId } from '$lib/types/token';
import { erc20Tokens } from '$lib/derived/erc20.derived';
import type { TokenPriceCurrencyResponse, TokenPriceResponse } from './coingecko';
import { CoinGeckoClient } from './coingecko';
import { get } from 'svelte/store';

const provider = new CoinGeckoClient({ autoRetry: true });

export const EthPrice = async (
	currency: string = DEFAULT_CURRENCY
): Promise<number | undefined> => {
	try {
		const price = await provider.simplePrice({
			vs_currencies: currency,
			ids: COINGECKO_ETHEREUM_NETWORK_ID
		});
		return price[COINGECKO_ETHEREUM_NETWORK_ID][currency];
	} catch (err) {
		return undefined;
	}
};

export const Erc20PriceByContract = async (
	tokenList: TokenId[],
	currency: string = DEFAULT_CURRENCY
): Promise<TokenPriceResponse> => {
	const tokens = get(erc20Tokens);

	const contract2Symbol: { [key: string]: TokenId } = {};
	for (const token of tokens) {
		contract2Symbol[token.address.toLowerCase()] = token.id;
	}

	const r: TokenPriceCurrencyResponse = await provider.simpleTokenPrice({
		id: COINGECKO_ETHEREUM_NETWORK_ID,
		vs_currencies: currency,
		contract_addresses: tokens.map((token) => token.address).join()
	});

	// transform from {<coin:str>: {<currency:str>: <value:number>},...} => {<coin:Symbol>: <value:number>}
	const xx = Object.keys(r)
		.map((k) => ({ [contract2Symbol[k.toLowerCase()]]: r[k][currency] }))
		.reduce(
			(obj, item) => ({ ...obj, ...item }),
			tokenList.reduce((acc, val) => ({ ...acc, [val]: undefined }), {})
		);
	return xx;
};
