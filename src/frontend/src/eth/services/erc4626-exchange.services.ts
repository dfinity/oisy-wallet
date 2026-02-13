import { INFURA_API_KEY } from '$env/rest/infura.env';
import { ERC4626_ABI } from '$eth/constants/erc4626.constants';
import type { Erc4626TokensExchangeData } from '$eth/types/erc4626';
import type { CoingeckoSimpleTokenPriceResponse } from '$lib/types/coingecko';
import { isNullish } from '@dfinity/utils';
import { Contract } from 'ethers/contract';
import { InfuraProvider } from 'ethers/providers';

export const calculateErc4626Prices = async ({
	erc20Prices,
	erc4626TokensExchangeData
}: {
	erc20Prices: CoingeckoSimpleTokenPriceResponse | null;
	erc4626TokensExchangeData: Erc4626TokensExchangeData[];
}): Promise<CoingeckoSimpleTokenPriceResponse> => {
	const results: CoingeckoSimpleTokenPriceResponse = {};

	await Promise.all(
		erc4626TokensExchangeData.map(
			async ({ vaultAddress, vaultDecimals, assetAddress, assetDecimals, infura, exchange }) => {
				try {
					if (isNullish(exchange?.coingeckoId)) {
						return;
					}

					const assetPrice = erc20Prices?.[assetAddress.toLowerCase()]?.usd;

					if (isNullish(assetPrice)) {
						return;
					}

					const provider = new InfuraProvider(infura, INFURA_API_KEY);
					const contract = new Contract(vaultAddress, ERC4626_ABI, provider);

					const oneShare = 10n ** BigInt(vaultDecimals);
					const assets = await contract.convertToAssets(oneShare);

					const assetsPerShare = Number(assets) / 10 ** assetDecimals;
					const sharePriceUsd = assetsPerShare * assetPrice;

					results[vaultAddress.toLowerCase()] = {
						usd: sharePriceUsd,
						// no value is available, therefore, we set it as 0
						usd_market_cap: 0
					};
				} catch (err: unknown) {
					console.error(`Error calculating ERC4626 vault price for ${vaultAddress}:`, err);
				}
			}
		)
	);

	return results;
};
