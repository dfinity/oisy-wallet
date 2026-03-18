import type { TokenId } from '$declarations/backend/backend.did';
import { assertNever } from '@dfinity/utils';

export const tokenIdKey = (id: TokenId): string => {
	if ('Icrc' in id) {
		return `Icrc:${id.Icrc.toText()}`;
	}

	if ('Erc20' in id) {
		return `Erc20:${id.Erc20[0].toLowerCase()}:${id.Erc20[1]}`;
	}

	if ('SplMainnet' in id) {
		return `SplMainnet:${id.SplMainnet.toLowerCase()}`;
	}

	if ('EvmNative' in id) {
		return `EvmNative:${id.EvmNative}`;
	}

	if ('BtcNativeMainnet' in id) {
		return 'BtcNativeMainnet';
	}

	if ('IcpNative' in id) {
		return 'IcpNative';
	}

	if ('SolNativeMainnet' in id) {
		return 'SolNativeMainnet';
	}

	assertNever(id, `Unknown token id type: ${id}`);
};
