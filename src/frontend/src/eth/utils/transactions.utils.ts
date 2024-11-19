import { ERC20_APPROVE_HASH } from '$eth/constants/erc20.constants';
import { loadEthereumTransactions } from '$eth/services/eth-transactions.services';
import type { EthTransactionUi } from '$eth/types/eth-transaction';
import type { OptionEthAddress } from '$lib/types/address';
import type { Token, TokenId } from '$lib/types/token';
import type { Transaction } from '$lib/types/transaction';
import type { ResultSuccess } from '$lib/types/utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';
import { ethers } from 'ethers';

export const isTransactionPending = ({ blockNumber }: Transaction): boolean =>
	isNullish(blockNumber);

export const isErc20TransactionApprove = (data: string | undefined): boolean =>
	nonNullish(data) && data.startsWith(ERC20_APPROVE_HASH);

export const decodeErc20AbiDataValue = (data: string): BigNumber => {
	const [_to, value] = ethers.utils.defaultAbiCoder.decode(
		['address', 'uint256'],
		ethers.utils.hexDataSlice(data, 4)
	);

	return value;
};

/**
 * It maps a transaction to an Ethereum transaction UI object
 */
export const mapEthTransactionUi = ({
	transaction,
	ckMinterInfoAddresses,
	$ethAddress
}: {
	transaction: Transaction;
	ckMinterInfoAddresses: OptionEthAddress[];
	$ethAddress: OptionEthAddress;
}): EthTransactionUi => {
	const { from, to } = transaction;

	return {
		...transaction,
		id: transaction.hash,
		uiType: ckMinterInfoAddresses.includes(from.toLowerCase())
			? 'withdraw'
			: ckMinterInfoAddresses.includes(to?.toLowerCase())
				? 'deposit'
				: from?.toLowerCase() === $ethAddress?.toLowerCase()
					? 'send'
					: 'receive'
	};
};

export type ResultByToken = ResultSuccess & { tokenId: TokenId };
type PromiseResult = Promise<ResultByToken>;

export const mapLoadTransactionsPromises = ({
	tokens,
	tokensAlreadyLoaded
}: {
	tokens: Token[];
	tokensAlreadyLoaded: TokenId[];
}): PromiseResult[] =>
	tokens.reduce<PromiseResult[]>((acc, { network: { id: networkId }, id: tokenId }) => {
		if (tokensAlreadyLoaded.includes(tokenId)) {
			return acc;
		}

		const promise = (async (): PromiseResult => {
			const result = await loadEthereumTransactions({ tokenId, networkId });
			return { ...result, tokenId };
		})();

		return [...acc, promise];
	}, []);
