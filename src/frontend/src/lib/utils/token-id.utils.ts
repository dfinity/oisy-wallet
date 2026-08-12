import type { TokenId } from '$declarations/backend/backend.did';
import type { EthereumNetwork } from '$eth/types/network';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isTokenErc4626 } from '$eth/utils/erc4626.utils';
import { isIcToken } from '$icp/validation/ic-token.validation';
import type { Token } from '$lib/types/token';
import {
	isNetworkIdBTCMainnet,
	isNetworkIdBTCTestnet,
	isNetworkIdEthereum,
	isNetworkIdEvm,
	isNetworkIdSOLDevnet,
	isNetworkIdSolana
} from '$lib/utils/network.utils';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { assertNever } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';

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

/**
 * Maps an OISY app token to its canonical backend {@link TokenId} variant — the
 * inverse direction of {@link tokenIdKey}, used when persisting an Active User
 * Transaction's `data` payload.
 *
 * Covers every asset the AUT consumers can swap: ERC-20 and ERC-4626 vault
 * tokens, native EVM coins, ICRC ledgers, SPL / native Solana on both mainnet
 * and devnet, and native Bitcoin on mainnet and testnet. Returns `undefined` for
 * anything else — including Bitcoin regtest, which has no backend variant —
 * which callers treat as "do not track this operation" rather than as an error.
 *
 * An Internet Computer token maps to `Icrc` by ledger canister id — including
 * ICP itself, whose dedicated `IcpNative` variant is reserved for the
 * exchange-rate path.
 */
export const toBackendTokenId = (token: Token): TokenId | undefined => {
	const {
		network: { id: networkId }
	} = token;

	if (isTokenErc20(token)) {
		return { Erc20: [token.address, BigInt(token.network.chainId)] };
	}

	if (isTokenErc4626(token)) {
		return { Erc4626: [token.address, BigInt(token.network.chainId)] };
	}

	if (isTokenSpl(token)) {
		return isNetworkIdSOLDevnet(networkId)
			? { SplDevnet: token.address }
			: { SplMainnet: token.address };
	}

	if (isIcToken(token)) {
		return { Icrc: Principal.fromText(token.ledgerCanisterId) };
	}

	// Native tokens carry no contract address; disambiguate by network.
	if (isNetworkIdSolana(networkId)) {
		return isNetworkIdSOLDevnet(networkId) ? { SolNativeDevnet: null } : { SolNativeMainnet: null };
	}

	// Each Bitcoin network is matched on its own rather than via `isNetworkIdBitcoin`,
	// so regtest — which has no backend `TokenId` variant — falls through to `undefined`.
	if (isNetworkIdBTCMainnet(networkId)) {
		return { BtcNativeMainnet: null };
	}

	if (isNetworkIdBTCTestnet(networkId)) {
		return { BtcNativeTestnet: null };
	}

	// Native EVM coin (ETH, BNB, POL, …), identified by chain id.
	if (isNetworkIdEthereum(networkId) || isNetworkIdEvm(networkId)) {
		return { EvmNative: BigInt((token.network as EthereumNetwork).chainId) };
	}

	return undefined;
};
