import {
	isConvertCkErc20ToErc20,
	isConvertCkEthToEth
} from '$icp-eth/utils/cketh-transactions.utils';
import {
	icrc1Transfer as icrc1TransferIcp,
	transfer as transferIcp
} from '$icp/api/icp-ledger.api';
import { transfer as transferIcrc } from '$icp/api/icrc-ledger.api';
import { transfer as transferDip20 } from '$icp/api/xtc-ledger.api';
import {
	convertCkBTCToBtc,
	convertCkETHToEth,
	convertCkErc20ToErc20
} from '$icp/services/ck.services';
import type { IcCkWithdrawalResult, IcSendParams, IcTransferParams } from '$icp/types/ic-send';
import type { IcToken } from '$icp/types/ic-token';
import { invalidIcpAddress } from '$icp/utils/account.utils';
import { invalidIcrcAddress } from '$icp/utils/icrc-account.utils';
import { isTokenDip20, isTokenIcrc } from '$icp/utils/icrc.utils';
import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
import { i18n } from '$lib/stores/i18n.store';
import type { NetworkId } from '$lib/types/network';
import { consoleError } from '$lib/utils/console.utils';
import { isNetworkIdBitcoin } from '$lib/utils/network.utils';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import type { BlockHeight } from '@icp-sdk/canisters/ledger/icp';
import { decodeIcrcAccount, type IcrcLedgerDid } from '@icp-sdk/canisters/ledger/icrc';
import { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';

export const sendIc = async ({
	progress,
	sendCompleted,
	onSent,
	...rest
}: IcTransferParams & {
	token: IcToken;
	targetNetworkId?: NetworkId;
	sendCompleted: () => void;
	// Runs the moment the transfer — for a ck withdrawal, the burn — is registered,
	// ahead of the wallet-refresh wait below: the send is irreversible from there, so
	// a caller that must record it (e.g. as an active user transaction) cannot sit
	// behind a deliberate delay a refresh or tab close would cut short.
	onSent?: (params: { result: IcCkWithdrawalResult | undefined }) => Promise<void> | void;
}): Promise<IcCkWithdrawalResult | undefined> => {
	const result = await send({
		progress,
		...rest
	});

	sendCompleted();

	// Best-effort by contract, like `onBroadcast` in `sendBtc`: a failing callback
	// must not derail the flow's own completion.
	try {
		await onSent?.({ result });
	} catch (err: unknown) {
		consoleError(err);
	}

	progress?.(ProgressStepsSendIc.RELOAD);

	await waitAndTriggerWallet();

	return result;
};

const send = async ({
	token,
	targetNetworkId,
	...rest
}: IcTransferParams & {
	token: IcToken;
	targetNetworkId?: NetworkId;
}): Promise<IcCkWithdrawalResult | undefined> => {
	if (isNetworkIdBitcoin(targetNetworkId)) {
		return await convertCkBTCToBtc({
			...rest,
			token
		});
	}

	if (isConvertCkEthToEth({ token, networkId: targetNetworkId })) {
		return await convertCkETHToEth({
			...rest,
			token
		});
	}

	if (isConvertCkErc20ToErc20({ token, networkId: targetNetworkId })) {
		return await convertCkErc20ToErc20({
			...rest,
			token
		});
	}

	const { ledgerCanisterId } = token;

	if (isTokenIcrc(token)) {
		await sendIcrc({
			...rest,
			ledgerCanisterId
		});
		return;
	}

	if (isTokenDip20(token)) {
		await sendDip20({
			...rest,
			ledgerCanisterId
		});
		return;
	}

	await sendIcp({
		...rest,
		ledgerCanisterId
	});
};

export const sendIcrc = ({
	to,
	amount,
	identity,
	ledgerCanisterId,
	progress
}: IcSendParams): Promise<IcrcLedgerDid.BlockIndex> => {
	const validIcrcAddress = !invalidIcrcAddress(to);

	// UI validates addresses and disable form if not compliant. Therefore, this issue should unlikely happen.
	if (!validIcrcAddress) {
		throw new Error(get(i18n).send.error.invalid_destination);
	}

	progress?.(ProgressStepsSendIc.SEND);

	return transferIcrc({
		identity,
		ledgerCanisterId,
		to: decodeIcrcAccount(to),
		amount
	});
};

export const sendIcp = ({
	to,
	amount,
	identity,
	ledgerCanisterId,
	progress
}: IcSendParams): Promise<BlockHeight> => {
	const validIcrcAddress = !invalidIcrcAddress(to);
	const validIcpAddress = !invalidIcpAddress(to);

	// UI validates addresses and disable form if not compliant. Therefore, this issue should unlikely happen.
	if (!validIcrcAddress && !validIcpAddress) {
		throw new Error(get(i18n).send.error.invalid_destination);
	}

	progress?.(ProgressStepsSendIc.SEND);

	return validIcrcAddress
		? icrc1TransferIcp({
				identity,
				ledgerCanisterId,
				to: decodeIcrcAccount(to),
				amount
			})
		: transferIcp({
				identity,
				ledgerCanisterId,
				to,
				amount
			});
};

export const sendDip20 = ({
	to,
	amount,
	identity,
	ledgerCanisterId,
	progress
}: IcSendParams): Promise<bigint> => {
	const validIcrcAddress = !invalidIcrcAddress(to);

	// UI validates addresses and disable form if not compliant. Therefore, this issue should unlikely happen.
	if (!validIcrcAddress) {
		throw new Error(get(i18n).send.error.invalid_destination);
	}

	progress?.(ProgressStepsSendIc.SEND);

	return transferDip20({
		identity,
		canisterId: ledgerCanisterId,
		to: Principal.fromText(to),
		amount
	});
};
