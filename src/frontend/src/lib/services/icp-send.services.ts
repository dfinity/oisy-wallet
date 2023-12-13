import { sendIcp as sendIcpApi, sendIcpIcrc1 } from '$lib/api/icp-ledger.api';
import type { TransferParams } from '$lib/services/send.services';
import { authStore } from '$lib/stores/auth.store';
import { invalidIcpAddress } from '$lib/utils/icp-account.utils';
import { invalidIcrcAddress } from '$lib/utils/icrc-account.utils';
import type { BlockHeight } from '@dfinity/ledger-icp';
import { decodeIcrcAccount } from '@dfinity/ledger-icrc';
import { get } from 'svelte/store';

export const sendIcp = async ({
	to,
	amount
}: Pick<TransferParams, 'amount' | 'to'>): Promise<BlockHeight> => {
	const validIcrcAddress = !invalidIcrcAddress(to);
	const validIcpAddress = !invalidIcpAddress(to);

	// UI validates addresses and disable form if not compliant. Therefore, this issue should unlikely happen.
	if (!validIcrcAddress && !validIcpAddress) {
		throw new Error('The address is invalid. Please try again with a valid address identifier.');
	}

	const { identity } = get(authStore);

	return validIcrcAddress
		? sendIcpIcrc1({
				identity,
				to: decodeIcrcAccount(to),
				amount: amount.toBigInt()
		  })
		: sendIcpApi({
				identity,
				to,
				amount: amount.toBigInt()
		  });
};
