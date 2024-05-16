import { isNotSupportedErc20TwinTokenId } from '$eth/utils/token.utils';
import type { OptionAddress } from '$lib/types/address';
import type { TokenId } from '$lib/types/token';
import { parseToken } from '$lib/utils/parse.utils';
import { nonNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';

export const isDestinationContractAddress = ({
	contractAddress,
	destination
}: {
	contractAddress: OptionAddress;
	destination: OptionAddress;
}): boolean =>
	nonNullish(contractAddress) && destination?.toLowerCase() === contractAddress.toLowerCase();

export const shouldSendWithApproval = ({
	to,
	tokenId,
	erc20HelperContractAddress
}: {
	to: string;
	tokenId: TokenId;
	erc20HelperContractAddress: OptionAddress;
}): boolean => {
	// Approve happens before send currently only for ckERC20 -> ERC20.
	// See Deposit schema: https://github.com/dfinity/ic/blob/master/rs/ethereum/cketh/docs/ckerc20.adoc
	if (isNotSupportedErc20TwinTokenId(tokenId)) {
		return false;
	}

	const destinationCkErc20 =
		nonNullish(erc20HelperContractAddress) &&
		isDestinationContractAddress({
			destination: to,
			contractAddress: erc20HelperContractAddress
		});

	// The Erc20 contract supports conversion to ckErc20 but, it's a standard transaction because the destination address does not equals the address of the erc20 contract address.
	if (!destinationCkErc20) {
		return false;
	}

	return true;
};

/**
 * As recommended by the cross-chain team, we add 10% to the amount to calculate the fee, providing some buffer for when the transaction is effectively executed.
 * @param amount An amount which can for example be entered by the user in an input field.
 * @returns The provided amount, defaulting to one if not provided, plus 10%
 */
export const amountForFeePlusTenPercent = (amount: string | number | undefined): BigNumber => {
	const baseAmount = parseToken({ value: `${amount ?? '1'}` });
	const additionalAmount = baseAmount.div(BigNumber.from('10'));
	return baseAmount.add(additionalAmount);
};
