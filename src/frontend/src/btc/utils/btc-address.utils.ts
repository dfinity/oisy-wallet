import type { BtcAddress } from '$declarations/backend/backend.did';
import {
	btcAddressMainnet,
	btcAddressRegtest,
	btcAddressTestnet
} from '$lib/derived/address.derived';
import type { NetworkId } from '$lib/types/network';
import { assertNever } from '$lib/types/utils';
import { isNetworkIdBTCRegtest, isNetworkIdBTCTestnet } from '$lib/utils/network.utils';
import {
	BtcAddressType,
	parseBtcAddress as parseBtcAddressCkbtc,
	type BtcAddressInfo
} from '@dfinity/ckbtc';
import { get } from 'svelte/store';

const createBtcAddressFromAddressInfo = ({ info }: { info: BtcAddressInfo }): BtcAddress => {
	switch (info.type) {
		case BtcAddressType.P2wpkhV0:
			return { P2WPKH: info.address };
		case BtcAddressType.P2pkh:
			return { P2PKH: info.address };
		case BtcAddressType.P2sh:
			return { P2SH: info.address };
		case BtcAddressType.P2wsh:
			return { P2WSH: info.address };
		case BtcAddressType.P2tr:
			return { P2TR: info.address };
		default:
			// This should never happen if the BtcAddressType enum is exhaustive
			throw new Error(`Unsupported Bitcoin address type: ${info.type}`);
	}
};

export const parseBtcAddress = (address: string): BtcAddress | undefined => {
	try {
		const info = parseBtcAddressCkbtc({ address });
		return createBtcAddressFromAddressInfo({ info });
	} catch (_: unknown) {
		return;
	}
};

export const getBtcAddressString = (address: BtcAddress): string => {
	if ('P2WPKH' in address) {
		return address.P2WPKH;
	}
	if ('P2PKH' in address) {
		return address.P2PKH;
	}
	if ('P2SH' in address) {
		return address.P2SH;
	}
	if ('P2WSH' in address) {
		return address.P2WSH;
	}
	if ('P2TR' in address) {
		return address.P2TR;
	}

	return assertNever({ variable: address, typeName: 'BtcAddress' });
};

/**
 * Get the BTC source address for a given network ID
 * @param networkId - The network ID
 * @returns The source address string
 */
export const getBtcSourceAddress = (networkId: NetworkId | undefined): string =>
	(isNetworkIdBTCTestnet(networkId)
		? get(btcAddressTestnet)
		: isNetworkIdBTCRegtest(networkId)
			? get(btcAddressRegtest)
			: get(btcAddressMainnet)) ?? '';
