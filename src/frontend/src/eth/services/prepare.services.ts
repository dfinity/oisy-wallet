import type { EthSignTransactionRequest } from '$declarations/signer/signer.did';
import type { NetworkChainId } from '$eth/types/network';
import { i18n } from '$lib/stores/i18n.store';
import type { TransferParams } from '$lib/types/send';
import { isNullish, toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

export const prepare = ({
	maxPriorityFeePerGas: max_priority_fee_per_gas,
	maxFeePerGas: max_fee_per_gas,
	nonce,
	gas,
	chainId: chain_id,
	data,
	to,
	amount
}: Omit<TransferParams, 'amount' | 'from'> &
	NetworkChainId & {
		nonce: number;
		gas: bigint;
		amount: bigint;
	}): EthSignTransactionRequest => {
	if (isNullish(data)) {
		const {
			send: {
				error: { erc20_data_undefined }
			}
		} = get(i18n);

		throw new Error(erc20_data_undefined);
	}

	return {
		to,
		chain_id,
		nonce: BigInt(nonce),
		gas,
		max_fee_per_gas,
		max_priority_fee_per_gas,
		value: amount,
		data: toNullable(data)
	};
};
