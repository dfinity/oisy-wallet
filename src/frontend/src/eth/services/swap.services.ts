import type { EthSignTransactionRequest } from '$declarations/signer/signer.did';
import { infuraProviders } from '$eth/providers/infura.providers';
import { processTransactionSent } from '$eth/services/eth-transaction.services';
import type { SwapParams } from '$eth/types/swap';
import { signTransaction } from '$lib/api/signer.api';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { i18n } from '$lib/stores/i18n.store';
import type { TransferParams } from '$lib/types/send';
import type { RequiredTransactionFeeData } from '$lib/types/transaction';
import { isNullish, toNullable } from '@dfinity/utils';
import type { TransactionParams } from '@velora-dex/sdk';
import type { TransactionResponse } from 'ethers/providers';
import { get } from 'svelte/store';

const prepareTransactionParams = ({
	maxPriorityFeePerGas: max_priority_fee_per_gas,
	maxFeePerGas: max_fee_per_gas,
	nonce,
	to,
	transaction
}: Omit<TransferParams, 'amount' | 'from'> & {
	nonce: number;
} & { transaction: TransactionParams }): EthSignTransactionRequest => {
	const { data, gas, chainId, value } = transaction;

	if (isNullish(gas) || isNullish(transaction)) {
		const {
			send: {
				error: { erc20_data_undefined }
			}
		} = get(i18n);

		throw new Error(erc20_data_undefined);
	}

	return {
		to,
		max_fee_per_gas,
		max_priority_fee_per_gas,
		nonce: BigInt(nonce),
		data: toNullable(data),
		gas: BigInt(gas),
		chain_id: BigInt(chainId),
		value: BigInt(value)
	};
};

const sendTransaction = async ({
	transaction,
	to,
	maxFeePerGas,
	maxPriorityFeePerGas,
	sourceNetwork,
	identity,
	nonce
}: Pick<TransferParams, 'from' | 'to'> &
	Omit<SwapParams, 'lastProgressStep'> &
	Omit<RequiredTransactionFeeData, 'gas'> & { nonce: number } & {
		transaction: TransactionParams;
	}): Promise<TransactionResponse> => {
	const { id: networkId } = sourceNetwork;

	const { sendTransaction } = infuraProviders(networkId);

	const transactionParams = prepareTransactionParams({
		maxPriorityFeePerGas,
		maxFeePerGas,
		nonce,
		to,
		transaction
	});

	const rawTransaction = await signTransaction({
		identity,
		transaction: transactionParams,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	return await sendTransaction(rawTransaction);
};

export const swap = async ({
	progress,
	token,
	transaction,
	from,
	sourceNetwork,
	...rest
}: Pick<TransferParams, 'from' | 'to'> &
	Omit<RequiredTransactionFeeData, 'gas'> &
	SwapParams & { transaction: TransactionParams }): Promise<{
	hash: string;
}> => {
	progress(ProgressStepsSwap.SWAP);

	const { id: networkId } = sourceNetwork;

	const { getTransactionCount } = infuraProviders(networkId);

	const nonce = await getTransactionCount(from);

	const transactionSent = await sendTransaction({
		progress,
		nonce,
		token,
		from,
		transaction,
		sourceNetwork,
		...rest
	});

	processTransactionSent({ token, transaction: transactionSent });

	return { hash: transactionSent.hash };
};
