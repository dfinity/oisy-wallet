import type { TokenId } from '$declarations/backend/backend.did';
import { assertNever } from '@dfinity/utils';

/**
 * Serializes a {@link TokenId} Candid variant into a deterministic string key.
 *
 * This is necessary because the backend canister returns freshly deserialized
 * `TokenId` objects that are value-equal but not reference-equal to the ones
 * we originally sent. Since JavaScript `Map` compares keys by reference,
 * we need a stable string representation to use as the map key.
 *
 * Returns `undefined` for `TokenId` variants that are not yet supported.
 */
export const tokenIdKey = (id: TokenId): string | undefined => {
	if ('Icrc' in id) {
		return `Icrc:${id.Icrc.toText()}`;
	}

	if ('Erc20' in id) {
		return `Erc20:${id.Erc20[0].toLowerCase()}:${id.Erc20[1]}`;
	}

	if ('SplMainnet' in id) {
		return `SplMainnet:${id.SplMainnet}`;
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

	if (
		'ExtV2' in id ||
		'SolNativeDevnet' in id ||
		'Erc721' in id ||
		'SplDevnet' in id ||
		'IcPunks' in id ||
		'BtcNativeTestnet' in id ||
		'Erc1155' in id ||
		'Erc4626' in id ||
		'Dip721' in id ||
		'Icrc7' in id
	) {
		return;
	}

	assertNever(id, `Unknown TokenId variant: ${id}`);
};
