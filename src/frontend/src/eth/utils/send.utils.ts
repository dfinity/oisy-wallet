import type { OptionEthAddress } from '$eth/types/address';
import { maxGasFee } from '$eth/utils/fee.utils';
import { isNotSupportedErc20TwinTokenId } from '$eth/utils/token.utils';
import type { OptionBalance } from '$lib/types/balance';
import type { TokenId } from '$lib/types/token';
import type { TransactionFeeData } from '$lib/types/transaction';
import { isNullish, nonNullish } from '@dfinity/utils';

export const isDestinationContractAddress = ({
	contractAddress,
	destination
}: {
	contractAddress: OptionEthAddress;
	destination: OptionEthAddress;
}): boolean =>
	nonNullish(contractAddress) && destination?.toLowerCase() === contractAddress.toLowerCase();

export const shouldSendWithApproval = ({
	to,
	tokenId,
	erc20HelperContractAddress
}: {
	to: string;
	tokenId: TokenId;
	erc20HelperContractAddress: OptionEthAddress;
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
 * Caps a native send at what the fee it will actually be signed with still leaves affordable.
 *
 * "Max" is priced against the fee sampled when the button is pressed, but the transaction is
 * signed with whatever the fee store holds at send time, and those are not the same sample: the
 * review step no longer re-applies "Max", while the fee keeps being refetched underneath it. When
 * the fee has risen in between, the frozen amount no longer leaves enough to cover
 * `gas * maxFeePerGas`, and the chain drops the transaction without reporting anything.
 *
 * Caps rather than re-derives upwards: a fee that has fallen leaves the reviewed amount untouched,
 * so the send never moves more than the user was shown. Only a "Max" send is capped, because only
 * there does the amount stand for "whatever is left" rather than a figure the user chose.
 */
export const capSendAmountToFee = ({
	amount,
	balance,
	feeData
}: {
	amount: bigint;
	balance: OptionBalance;
	feeData: TransactionFeeData;
}): bigint => {
	const gasFee = maxGasFee(feeData);

	if (isNullish(balance) || isNullish(gasFee)) {
		return amount;
	}

	const affordable = balance - gasFee;

	return affordable < amount ? affordable : amount;
};
