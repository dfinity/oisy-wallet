import {
	icrc1Transfer as icrc1TransferIcp,
	transfer as transferIcp
} from '$icp/api/icp-ledger.api';
import { transfer as transferIcrc } from '$icp/api/icrc-ledger.api';
import type { IcToken } from '$icp/types/ic';
import { invalidIcpAddress } from '$icp/utils/icp-account.utils';
import { invalidIcrcAddress } from '$icp/utils/icrc-account.utils';
import type { OptionIdentity } from '$lib/types/identity';
import type { TransferParams } from '$lib/types/send';
import type { BlockHeight } from '@dfinity/ledger-icp';
import { decodeIcrcAccount, type IcrcBlockIndex } from '@dfinity/ledger-icrc';

export const sendIc = async ({
	token: { standard, ledgerCanisterId },
	...rest
}: Pick<TransferParams, 'amount' | 'to'> & {
	identity: OptionIdentity;
	token: IcToken;
}): Promise<bigint> => {
	if (standard === 'icrc') {
		return sendIcrc({
			...rest,
			ledgerCanisterId
		});
	}

	return sendIcp({
		...rest
	});
};

const sendIcrc = async ({
	to,
	amount,
	identity,
	ledgerCanisterId
}: Pick<TransferParams, 'amount' | 'to'> & {
	identity: OptionIdentity;
} & Pick<IcToken, 'ledgerCanisterId'>): Promise<IcrcBlockIndex> => {
	const validIcrcAddress = !invalidIcrcAddress(to);

	// UI validates addresses and disable form if not compliant. Therefore, this issue should unlikely happen.
	if (!validIcrcAddress) {
		throw new Error('The address is invalid. Please try again with a valid address identifier.');
	}

	return transferIcrc({
		identity,
		ledgerCanisterId,
		to: decodeIcrcAccount(to),
		amount: amount.toBigInt()
	});
};

const sendIcp = async ({
	to,
	amount,
	identity
}: Pick<TransferParams, 'amount' | 'to'> & { identity: OptionIdentity }): Promise<BlockHeight> => {
	const validIcrcAddress = !invalidIcrcAddress(to);
	const validIcpAddress = !invalidIcpAddress(to);

	// UI validates addresses and disable form if not compliant. Therefore, this issue should unlikely happen.
	if (!validIcrcAddress && !validIcpAddress) {
		throw new Error('The address is invalid. Please try again with a valid address identifier.');
	}

	return validIcrcAddress
		? icrc1TransferIcp({
				identity,
				to: decodeIcrcAccount(to),
				amount: amount.toBigInt()
			})
		: transferIcp({
				identity,
				to,
				amount: amount.toBigInt()
			});
};
