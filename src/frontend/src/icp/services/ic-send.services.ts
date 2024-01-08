import {
	icrc1Transfer as icrc1TransferIcp,
	transfer as transferIcp
} from '$icp/api/icp-ledger.api';
import { transfer as transferIcrc } from '$icp/api/icrc-ledger.api';
import type { IcToken } from '$icp/types/ic';
import type { IcTransferParams } from '$icp/types/ic-send';
import { invalidIcpAddress } from '$icp/utils/icp-account.utils';
import { invalidIcrcAddress } from '$icp/utils/icrc-account.utils';
import type { OptionIdentity } from '$lib/types/identity';
import type { TransferParams } from '$lib/types/send';
import type { BlockHeight } from '@dfinity/ledger-icp';
import { decodeIcrcAccount, type IcrcBlockIndex } from '@dfinity/ledger-icrc';
import {SendIcStep} from "$lib/enums/steps";
import type {NetworkId} from "$lib/types/network";
import {isNetworkIdBTC} from "$icp/utils/send.utils";
import {networkId} from "$lib/derived/network.derived";

export const sendIc = async ({
	token: { standard, ledgerCanisterId },
	targetNetworkId,
	...rest
}: IcTransferParams & {
	token: IcToken;
	targetNetworkId: NetworkId;
}): Promise<bigint> => {
	if (isNetworkIdBTC(targetNetworkId)) {
		// TODO
	}

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
	ledgerCanisterId,
	progress
}: IcTransferParams & Pick<IcToken, 'ledgerCanisterId'>): Promise<IcrcBlockIndex> => {
	const validIcrcAddress = !invalidIcrcAddress(to);

	// UI validates addresses and disable form if not compliant. Therefore, this issue should unlikely happen.
	if (!validIcrcAddress) {
		throw new Error('The address is invalid. Please try again with a valid address identifier.');
	}

	progress(SendIcStep.SEND);

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
	identity,
	progress
}: IcTransferParams): Promise<BlockHeight> => {
	const validIcrcAddress = !invalidIcrcAddress(to);
	const validIcpAddress = !invalidIcpAddress(to);

	// UI validates addresses and disable form if not compliant. Therefore, this issue should unlikely happen.
	if (!validIcrcAddress && !validIcpAddress) {
		throw new Error('The address is invalid. Please try again with a valid address identifier.');
	}

	progress(SendIcStep.SEND);

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
