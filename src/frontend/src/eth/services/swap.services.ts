import type { EthSignTransactionRequest } from '$declarations/signer/signer.did';
import { infuraProviders } from '$eth/providers/infura.providers';
import { processTransactionSent } from '$eth/services/eth-transaction.services';
import { getNonce } from '$eth/services/nonce.services';
import type { SwapParams } from '$eth/types/swap';
import { isBroadcastRetriable } from '$eth/utils/eth-error.utils';
import { signTransaction } from '$lib/api/signer.api';
import {
	SWAP_BROADCAST_ATTEMPTS,
	SWAP_BROADCAST_RETRY_DELAY_MILLIS
} from '$lib/constants/swap.constants';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { i18n } from '$lib/stores/i18n.store';
import { SwapBroadcastOutcomeUnknownError } from '$lib/types/errors';
import type { NetworkId } from '$lib/types/network';
import type { TransferParams } from '$lib/types/send';
import type { RequiredTransactionFeeData } from '$lib/types/transaction';
import { consoleError } from '$lib/utils/console.utils';
import { waitForMilliseconds } from '$lib/utils/timeout.utils';
import { isNullish, toNullable } from '@dfinity/utils';
import type { TransactionParams } from '@velora-dex/sdk';
import { keccak256 } from 'ethers/crypto';
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

const signSwapTransaction = ({
	transaction,
	to,
	maxFeePerGas,
	maxPriorityFeePerGas,
	identity,
	nonce
}: Pick<TransferParams, 'to'> &
	Pick<SwapParams, 'identity'> &
	Omit<RequiredTransactionFeeData, 'gas'> & { nonce: number } & {
		transaction: TransactionParams;
	}): Promise<string> =>
	signTransaction({
		identity,
		transaction: prepareTransactionParams({
			maxPriorityFeePerGas,
			maxFeePerGas,
			nonce,
			to,
			transaction
		}),
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

// The same signed bytes are sent again while the node has neither refused them nor answered that
// they are in: a transport failure or a server error would otherwise leave a signed swap unsent, and
// with one hash and one nonce they cannot swap twice.
//
// Once an attempt has failed in a way that may have relayed them, no later answer shows they were
// not taken: a refusal answers only its own attempt. The broadcast then ends with an unknown outcome
// rather than the refusal, so that the caller does not take it for one of the first attempt.
const broadcast = async ({
	networkId,
	rawTransaction
}: {
	networkId: NetworkId;
	rawTransaction: string;
}): Promise<TransactionResponse> => {
	const { sendTransaction } = infuraProviders(networkId);

	let relayed = false;

	for (let attempt = 1; attempt < SWAP_BROADCAST_ATTEMPTS; attempt++) {
		try {
			return await sendTransaction(rawTransaction);
		} catch (err: unknown) {
			if (!isBroadcastRetriable(err)) {
				throw relayed ? new SwapBroadcastOutcomeUnknownError({ cause: err }) : err;
			}

			relayed = true;
			consoleError(err);
		}

		await waitForMilliseconds(SWAP_BROADCAST_RETRY_DELAY_MILLIS);
	}

	try {
		return await sendTransaction(rawTransaction);
	} catch (err: unknown) {
		throw relayed ? new SwapBroadcastOutcomeUnknownError({ cause: err }) : err;
	}
};

export const swap = async ({
	progress,
	token,
	identity,
	transaction,
	from,
	sourceNetwork,
	amount,
	beforeBroadcast,
	...rest
}: Pick<TransferParams, 'from' | 'to'> &
	Omit<RequiredTransactionFeeData, 'gas'> &
	SwapParams & {
		transaction: TransactionParams;
		// The amount of `token` swapped, which the pending activity shows: the calldata calls a swap
		// contract, not a transfer the amount could be read from.
		amount: bigint;
		// Runs once the transaction is signed and before it is broadcast, with what identifies it on
		// chain. Should it reject, nothing is broadcast.
		beforeBroadcast?: (params: { hash: string; nonce: number }) => Promise<void>;
	}): Promise<{
	hash: string;
	nonce: number;
}> => {
	progress(ProgressStepsSwap.SWAP);

	const { id: networkId } = sourceNetwork;

	const nonce = await getNonce({ from, networkId });

	const rawTransaction = await signSwapTransaction({
		nonce,
		identity,
		transaction,
		...rest
	});

	// The hash of a typed transaction is the hash of its signed bytes.
	await beforeBroadcast?.({ hash: keccak256(rawTransaction), nonce });

	const transactionSent = await broadcast({ networkId, rawTransaction });

	// Not awaited: the pending activity settles in the background, and its failure is not the swap's.
	processTransactionSent({ identity, token, transaction: transactionSent, value: amount }).catch(
		consoleError
	);

	// The nonce is returned so callers can persist it: it is what later tells a
	// transaction that is merely unmined from one that was replaced or dropped.
	return { hash: transactionSent.hash, nonce };
};
