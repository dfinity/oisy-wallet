import {
	icrc1Transfer as icrc1TransferIcp,
	transfer as transferIcp
} from '$icp/api/icp-ledger.api';
import { transfer as transferIcrc } from '$icp/api/icrc-ledger.api';
import {
	convertCkBTCToBtc,
	convertCkETHToEth,
	convertCkErc20ToErc20
} from '$icp/services/ck.services';
import type { IcToken } from '$icp/types/ic';
import type { IcTransferParams } from '$icp/types/ic-send';
import {
	isNetworkIdBTC,
	isNetworkIdETH,
	isTokenCkErc20Ledger,
	isTokenCkEthLedger
} from '$icp/utils/ic-send.utils';
import { waitAndTriggerWallet } from '$icp/utils/ic-wallet.utils';
import { invalidIcpAddress } from '$icp/utils/icp-account.utils';
import { invalidIcrcAddress } from '$icp/utils/icrc-account.utils';
import { SendIcStep } from '$lib/enums/steps';
import { i18n } from '$lib/stores/i18n.store';
import type { NetworkId } from '$lib/types/network';
import type { BlockHeight } from '@dfinity/ledger-icp';
import { decodeIcrcAccount, type IcrcBlockIndex } from '@dfinity/ledger-icrc';
import { get } from 'svelte/store';

export const sendIc = async ({
	progress,
	...rest
}: IcTransferParams & {
	token: IcToken;
	targetNetworkId: NetworkId | undefined;
}): Promise<void> => {
	await send({
		progress,
		...rest
	});

	progress(SendIcStep.RELOAD);

	await waitAndTriggerWallet();
};

const send = async ({
	token,
	targetNetworkId,
	...rest
}: IcTransferParams & {
	token: IcToken;
	targetNetworkId: NetworkId | undefined;
}): Promise<void> => {
	if (isNetworkIdBTC(targetNetworkId)) {
		await convertCkBTCToBtc({
			...rest,
			token
		});
		return;
	}

	if (isNetworkIdETH(targetNetworkId) && isTokenCkEthLedger(token)) {
		await convertCkETHToEth({
			...rest,
			token
		});
		return;
	}

	if (isNetworkIdETH(targetNetworkId) && isTokenCkErc20Ledger(token)) {
		await convertCkErc20ToErc20({
			...rest,
			token
		});
		return;
	}

	const { standard, ledgerCanisterId } = token;

	if (standard === 'icrc') {
		await sendIcrc({
			...rest,
			ledgerCanisterId
		});
		return;
	}

	await sendIcp({
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
		throw new Error(get(i18n).send.error.invalid_destination);
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
		throw new Error(get(i18n).send.error.invalid_destination);
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
