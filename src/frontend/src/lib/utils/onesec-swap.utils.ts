import type {
	ActiveUserTransaction,
	ActiveUserTransactionData,
	ActiveUserTransactionRef,
	ActiveUserTransactionStatus,
	TokenId as BackendTokenId
} from '$declarations/backend/backend.did';
import { ARBITRUM_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.base.env';
import { ONESEC_SWAP_ENABLED } from '$env/rest/onesec.env';
import type { Erc20Token } from '$eth/types/erc20';
import type { IcToken } from '$icp/types/ic-token';
import { isIcToken } from '$icp/validation/ic-token.validation';
import { ZERO } from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import type { NetworkId } from '$lib/types/network';
import {
	ONESEC_EXTERNAL_REF_KEYS,
	type IcpLedgerEntry,
	type OneSecExternalRefKey,
	type OneSecStatus
} from '$lib/types/onesec-swap';
import { SwapProvider } from '$lib/types/swap';
import type { Token as AppToken } from '$lib/types/token';
import { isNullish, nonNullish } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';
import { DEFAULT_CONFIG, type TokenConfig, type Transfer } from 'onesec-bridge';
import { get } from 'svelte/store';

const buildIcpLedgerMap = (): Record<string, IcpLedgerEntry> =>
	[...DEFAULT_CONFIG.tokens].reduce<Record<string, IcpLedgerEntry>>((map, [token, config]) => {
		const ledger = config.ledgerMainnet ?? config.ledger;
		if (nonNullish(ledger)) {
			map[ledger] = { token, config };
		}
		return map;
	}, {});

export const ICP_LEDGER_TO_TOKEN = buildIcpLedgerMap();

export const computeReceiveAmount = ({
	amount,
	transferFeeInUnits,
	protocolFeeInPercent,
	decimals
}: {
	amount: bigint;
	transferFeeInUnits: bigint;
	protocolFeeInPercent: number;
	decimals: number;
}): bigint => {
	const amountInTokens = Number(amount) / 10 ** decimals;
	const protocolFee = BigInt(
		Math.ceil(amountInTokens * (protocolFeeInPercent / 100) * 10 ** decimals)
	);
	const totalFee = transferFeeInUnits + protocolFee;
	return amount > totalFee ? amount - totalFee : ZERO;
};

const getEvmAddressForNetwork = ({
	config,
	networkId
}: {
	config: TokenConfig;
	networkId: NetworkId;
}): string | undefined =>
	networkId === ARBITRUM_MAINNET_NETWORK_ID
		? (config.erc20MainnetArbitrum ?? config.erc20Mainnet ?? config.erc20)
		: networkId === BASE_NETWORK_ID
			? (config.erc20MainnetBase ?? config.erc20Mainnet ?? config.erc20)
			: (config.erc20MainnetEthereum ?? config.erc20Mainnet ?? config.erc20);

/**
 * Returns ICP ledger canister IDs of tokens supported by OneSec on the ICP side.
 */
export const oneSecIcpSupportedTokens = (): Promise<Set<string>> =>
	Promise.resolve(new Set(Object.keys(ICP_LEDGER_TO_TOKEN)));

/**
 * Returns ERC20 addresses (lowercased) of tokens supported by OneSec on the given EVM networks.
 */
export const oneSecEvmSupportedTokens = ({
	networkIds
}: {
	networkIds: NetworkId[];
}): Promise<Set<string>> => {
	const supported = new Set<string>();

	for (const networkId of networkIds) {
		for (const [, config] of DEFAULT_CONFIG.tokens) {
			const address = getEvmAddressForNetwork({ config, networkId });

			if (address) {
				supported.add(address.toLowerCase());
			}
		}
	}

	return Promise.resolve(supported);
};

/**
 * Returns per-category token identifiers that OneSec can bridge TO from the given source token.
 * - ICP source → { evm: Set<ERC20 address lowercased> } for the given EVM network IDs
 * - EVM source → { icp: Set<ICP ledger canister ID> }
 * - Unknown → undefined (no OneSec restriction applied)
 */
export const oneSecCompatibleDestinations = ({
	sourceToken,
	networkIds
}: {
	sourceToken: AppToken;
	networkIds: NetworkId[];
}): Partial<Record<'icp' | 'evm' | 'sol', Set<string>>> | undefined => {
	if (!ONESEC_SWAP_ENABLED) {
		return;
	}

	if (isIcToken(sourceToken)) {
		const entry = ICP_LEDGER_TO_TOKEN[sourceToken.ledgerCanisterId];
		if (isNullish(entry)) {
			return;
		}

		const addresses = new Set<string>();
		for (const networkId of networkIds) {
			const address = getEvmAddressForNetwork({ config: entry.config, networkId });
			if (nonNullish(address)) {
				addresses.add(address.toLowerCase());
			}
		}

		return addresses.size > 0 ? { evm: addresses } : undefined;
	}

	// EVM source: find OneSec token by matching ERC20 address on the source network
	const srcAddress = (sourceToken as Erc20Token).address;
	if (isNullish(srcAddress)) {
		return;
	}

	for (const [, config] of DEFAULT_CONFIG.tokens) {
		const address = getEvmAddressForNetwork({ config, networkId: sourceToken.network.id });
		if (nonNullish(address) && address.toLowerCase() === srcAddress.toLowerCase()) {
			const ledger = config.ledgerMainnet ?? config.ledger;
			return nonNullish(ledger) ? { icp: new Set([ledger]) } : { icp: new Set() };
		}
	}

	// No OneSec config matched this EVM address: restrict ICP destinations to nothing.
	return { icp: new Set() };
};

export const isOneSecActiveUserTransaction = (tx: ActiveUserTransaction): boolean =>
	'OneSecIcpToEvm' in tx.data || 'OneSecEvmToIcp' in tx.data;

/**
 * Maps a OneSec SDK `Status` to the AUT status enum. Returns `undefined`
 * when the OneSec status doesn't map to a meaningful AUT state
 * (`PendingRefundTx` is treated as "still in flight" until the refund lands).
 */
export const toActiveUserTransactionStatus = (
	oneSecStatus: OneSecStatus
): ActiveUserTransactionStatus | undefined => {
	if ('Succeeded' in oneSecStatus) {
		return { Succeeded: null };
	}

	// `Refunded` is a terminal OneSec state: the source tokens were returned to
	// the user, so the swap did not deliver the destination amount. Without
	// this branch the cross-session poller leaves the row stuck in Executing
	// forever (the in-session closer handles refunds via the SDK step state).
	if ('Failed' in oneSecStatus || 'Refunded' in oneSecStatus) {
		return { Failed: null };
	}

	if (
		'PendingSourceTx' in oneSecStatus ||
		'PendingDestinationTx' in oneSecStatus ||
		'PendingRefundTx' in oneSecStatus
	) {
		return { Executing: null };
	}

	return undefined;
};

export const oneSecStatusError = (oneSecStatus: OneSecStatus): string | undefined => {
	if ('Failed' in oneSecStatus) {
		return oneSecStatus.Failed.error;
	}

	if ('Refunded' in oneSecStatus) {
		return get(i18n).swap.error.swap_refunded;
	}

	return undefined;
};

/**
 * Loosely matches a OneSec transfer to an AUT row by direction and source
 * amount. The SDK doesn't yet expose transfer ids in this response, so we
 * fall back to (chain, amount) matching. Identical concurrent swaps could
 * collide; for now the first match wins.
 */
export const findMatchingOneSecTransfer = ({
	transfers,
	data
}: {
	transfers: Transfer[];
	data: ActiveUserTransactionData;
}): Transfer | undefined => {
	const isIcpToEvm = 'OneSecIcpToEvm' in data;
	const isEvmToIcp = 'OneSecEvmToIcp' in data;

	const amount = isIcpToEvm
		? data.OneSecIcpToEvm.amount
		: isEvmToIcp
			? data.OneSecEvmToIcp.amount
			: undefined;

	if (isNullish(amount)) {
		return undefined;
	}

	return transfers.find((t) => {
		if (isNullish(t.source.amount) || t.source.amount !== amount) {
			return false;
		}

		const sourceChain = t.source.chain;

		if (isIcpToEvm) {
			return sourceChain === 'ICP';
		}

		return nonNullish(sourceChain) && sourceChain !== 'ICP';
	});
};

/**
 * Maps an Erc20Token to the canister-side `TokenId` variant. Native EVM tokens
 * are not currently supported by OneSec swaps in OISY, so this helper assumes
 * an ERC-20 source/destination. The chain id is required (and present on the
 * `Erc20Token`'s network).
 */
const erc20ToBackendTokenId = (token: Erc20Token): BackendTokenId => ({
	Erc20: [token.address, BigInt(token.network.chainId)]
});

const icrcToBackendTokenId = (token: IcToken): BackendTokenId => ({
	Icrc: Principal.fromText(token.ledgerCanisterId)
});

interface OneSecIcpToEvmInput {
	sourceToken: IcToken;
	destinationToken: Erc20Token;
	amount: bigint;
	recipientEvmAddress: string;
}

interface OneSecEvmToIcpInput {
	sourceToken: Erc20Token;
	destinationToken: IcToken;
	amount: bigint;
	recipientPrincipal: Principal;
}

export const toOneSecIcpToEvmData = ({
	sourceToken,
	destinationToken,
	amount,
	recipientEvmAddress
}: OneSecIcpToEvmInput): ActiveUserTransactionData => ({
	OneSecIcpToEvm: {
		source_token: icrcToBackendTokenId(sourceToken),
		dest_token: erc20ToBackendTokenId(destinationToken),
		amount,
		recipient_evm_address: recipientEvmAddress
	}
});

export const toOneSecEvmToIcpData = ({
	sourceToken,
	destinationToken,
	amount,
	recipientPrincipal
}: OneSecEvmToIcpInput): ActiveUserTransactionData => ({
	OneSecEvmToIcp: {
		source_token: erc20ToBackendTokenId(sourceToken),
		dest_token: icrcToBackendTokenId(destinationToken),
		amount,
		recipient_principal: recipientPrincipal
	}
});

/**
 * Builds a `(key, value)` external-ref array for a OneSec record. Keys are
 * stable strings that the poller can match on; values are opaque.
 *
 * Order is unimportant on the wire — backend stores them as-is — but we keep
 * them deterministic so test assertions don't churn.
 */
export const toOneSecExternalRefs = (
	refs: Partial<Record<OneSecExternalRefKey, string>>
): ActiveUserTransactionRef[] =>
	(Object.keys(refs) as OneSecExternalRefKey[])
		.filter((key) => refs[key] !== undefined && refs[key] !== '')
		.sort()
		.map((key) => ({ key, value: refs[key] as string }));

/**
 * Snapshots the user-facing fields needed to render an AUT row and to fire
 * its terminal-state analytics events: the raw token amount (as typed by the
 * user, not the parsed bigint), and source/destination token + network
 * symbols. Read back from `tx.external_refs` so the UI and analytics stay
 * accurate across page refresh / cross-session resume — even when the user
 * has since disabled the underlying token.
 */
export const toOneSecDisplayRefs = ({
	sourceToken,
	destinationToken,
	amount
}: {
	sourceToken: AppToken;
	destinationToken: AppToken;
	amount: string;
}): Partial<Record<OneSecExternalRefKey, string>> => ({
	[ONESEC_EXTERNAL_REF_KEYS.AMOUNT]: amount,
	[ONESEC_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL]: sourceToken.symbol,
	[ONESEC_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL]: sourceToken.network.name,
	[ONESEC_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL]: destinationToken.symbol,
	[ONESEC_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL]: destinationToken.network.name
});

/**
 * Inverse of {@link toOneSecExternalRefs}: turns the row's wire-format
 * `(key, value)` array into a keyed lookup map. Callers — both
 * {@link buildOneSecSwapTrackingMetadata} and the UI components that render
 * an AUT row — index by `ONESEC_EXTERNAL_REF_KEYS.*` instead of scanning the
 * array for each field.
 *
 * Unknown keys (refs written by an older FE version or another provider) are
 * preserved on the returned object, but the typed signature only surfaces
 * the OneSec keys the rest of the code reasons about.
 */
export const toOneSecExternalRefsMap = (
	refs: ActiveUserTransactionRef[]
): Partial<Record<OneSecExternalRefKey, string>> => {
	const map: Partial<Record<OneSecExternalRefKey, string>> = {};

	for (const { key, value } of refs) {
		map[key as OneSecExternalRefKey] = value;
	}

	return map;
};

/**
 * Builds the analytics metadata for a OneSec AUT row that has just reached a
 * terminal status. Mirrors the `swapTrackingMetadata` shape emitted by
 * `SwapEthWizard` / `SwapIcpWizard` so success/error events fired from the
 * AUT store match the in-wizard `swap_submitted` event for the same swap.
 *
 * All resolution happens off the row's `external_refs` snapshot (written at
 * creation time), so the values stay correct across page refresh / cross-
 * session resume and remain available even when the user has since disabled
 * the underlying token. Legacy rows created before the snapshot fields were
 * added simply emit empty strings for those fields.
 */
export const buildOneSecSwapTrackingMetadata = ({
	tx
}: {
	tx: ActiveUserTransaction;
}): Record<string, string> => {
	const refs = toOneSecExternalRefsMap(tx.external_refs);

	return {
		sourceToken: refs[ONESEC_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL] ?? '',
		destinationToken: refs[ONESEC_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL] ?? '',
		dApp: SwapProvider.ONE_SEC,
		tokenAmount: refs[ONESEC_EXTERNAL_REF_KEYS.AMOUNT] ?? '',
		sourceNetwork: refs[ONESEC_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL] ?? '',
		destinationNetwork: refs[ONESEC_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL] ?? '',
		...(nonNullish(tx.error[0]) ? { error: tx.error[0] } : {})
	};
};
