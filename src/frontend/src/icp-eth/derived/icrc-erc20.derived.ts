import { enabledErc20Tokens } from '$eth/derived/erc20.derived';
import { enabledErc4626AssetAddresses } from '$eth/derived/erc4626.derived';
import type { Erc20Token } from '$eth/types/erc20';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import type { Erc20ContractAddressWithNetwork } from '$icp-eth/types/icrc-erc20';
import { enabledIcrcTokens } from '$icp/derived/icrc.derived';
import type { IcCkToken, IcToken } from '$icp/types/ic-token';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

const enabledErc20TokensAddresses: Readable<Erc20ContractAddressWithNetwork[]> = derived(
	[enabledErc20Tokens],
	([$enabledErc20Tokens]) =>
		$enabledErc20Tokens.map(({ address, network: { exchange } }: Erc20Token) => ({
			address,
			coingeckoId: exchange?.coingeckoId ?? 'ethereum'
		}))
);

const enabledIcrcTwinTokensAddresses: Readable<Erc20ContractAddressWithNetwork[]> = derived(
	[enabledIcrcTokens],
	([$enabledIcrcTokens]) =>
		$enabledIcrcTokens
			.filter((token: IcToken) => {
				if (isNullish((token as Partial<IcCkToken>).twinToken)) {
					return false;
				}

				const { twinToken } = token as Partial<IcCkToken>;

				if (isNullish(twinToken)) {
					return false;
				}

				return isTokenErc20(twinToken) && nonNullish(twinToken.address);
			})
			.map((token) => {
				const {
					address,
					network: { exchange }
				} = (token as IcCkToken).twinToken as Erc20Token;

				return { address, coingeckoId: exchange?.coingeckoId ?? 'ethereum' };
			})
);

export const enabledMergedErc20TokensAddresses: Readable<Erc20ContractAddressWithNetwork[]> =
	derived(
		[enabledIcrcTwinTokensAddresses, enabledErc20TokensAddresses, enabledErc4626AssetAddresses],
		([
			$enabledIcrcTwinTokensAddresses,
			$enabledErc20TokensAddresses,
			$enabledErc4626AssetAddresses
		]) => [
			...new Map(
				[
					...$enabledErc20TokensAddresses,
					...$enabledIcrcTwinTokensAddresses,
					...$enabledErc4626AssetAddresses
				].map((item) => [`${item.address}|${item.coingeckoId}`, item])
			).values()
		]
	);
