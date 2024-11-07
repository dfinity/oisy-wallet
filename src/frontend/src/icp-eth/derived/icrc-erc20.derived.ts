import { enabledErc20TokensAddresses } from '$eth/derived/erc20.derived';
import type { ContractAddressText } from '$eth/types/address';
import type { Erc20ContractAddress, Erc20Token } from '$eth/types/erc20';
import { enabledIcrcTokens } from '$icp/derived/icrc.derived';
import type { IcCkToken, IcToken } from '$icp/types/ic-token';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const enabledIcrcTwinTokensAddresses: Readable<ContractAddressText[]> = derived(
	[enabledIcrcTokens],
	([$enabledIcrcTokens]) =>
		$enabledIcrcTokens
			.filter((token: IcToken) =>
				nonNullish(((token as Partial<IcCkToken>).twinToken as Erc20Token | undefined)?.address)
			)
			.map((token) => ((token as IcCkToken).twinToken as Erc20Token).address)
);

export const enabledMergedErc20TokensAddresses: Readable<Erc20ContractAddress[]> = derived(
	[enabledIcrcTwinTokensAddresses, enabledErc20TokensAddresses],
	([$enabledIcrcTwinTokensAddresses, $enabledErc20TokensAddresses]) =>
		[...new Set([...$enabledErc20TokensAddresses, ...$enabledIcrcTwinTokensAddresses])].map(
			(address) => ({ address })
		)
);
