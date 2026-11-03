import { ERC20_MAX_DISPLAY_DECIMALS } from '$eth/constants/erc20.constants';
import type { EthAddress } from '$eth/types/address';
import type { Erc20Token } from '$eth/types/erc20';
import type { EthereumNetwork } from '$eth/types/network';
import { mapErc20Token } from '$eth/utils/erc20.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { visibleTokenSymbol } from '$lib/utils/token-symbol.utils';
import { nonNullish } from '@dfinity/utils';

export const isDisplayableErc20Decimals = (decimals: number): boolean =>
	Number.isInteger(decimals) && decimals >= 0 && decimals <= ERC20_MAX_DISPLAY_DECIMALS;

/**
 * How a token OISY does not list is named. Anybody can deploy a contract that calls itself "USDC",
 * so the symbol it reports is only ever shown inside the placeholder, never on its own: a token the
 * wallet does not list never reads as one it does.
 */
export const unlistedErc20Name = ({
	symbol,
	unknownTokenLabel,
	unknownTokenNamedLabel
}: {
	symbol: string | undefined;
	unknownTokenLabel: string;
	// The placeholder with a `$symbol` in it, for a contract that reports a symbol of its own.
	unknownTokenNamedLabel: string;
}): string => {
	const visible = visibleTokenSymbol(symbol);

	return nonNullish(visible)
		? replacePlaceholders(unknownTokenNamedLabel, { $symbol: visible })
		: unknownTokenLabel;
};

/**
 * The token a review states amounts in for a contract OISY does not list. Its decimals are the
 * contract's own, which are what the contract reads the amount with; its name stands in for the
 * symbol, so every amount reads as the unlisted token it is.
 */
export const toUnlistedErc20Token = ({
	address,
	network,
	decimals,
	name
}: {
	address: EthAddress;
	network: EthereumNetwork;
	decimals: number;
	name: string;
}): Erc20Token =>
	mapErc20Token({
		address,
		network,
		decimals,
		name,
		symbol: name,
		category: 'custom'
	});
