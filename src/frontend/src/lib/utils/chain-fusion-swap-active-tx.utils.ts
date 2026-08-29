import type {
	ActiveUserTransaction,
	ActiveUserTransactionData,
	ActiveUserTransactionRef,
	ActiveUserTransactionStatus,
	ChainFusionDirection
} from '$declarations/backend/backend.did';
import {
	CKERC20_HELPER_CONTRACT_SIGNATURE,
	CKETH_HELPER_CONTRACT_SIGNATURE
} from '$env/networks/networks.cketh.env';
import type { EthAddress } from '$eth/types/address';
import { tokenAddressToHex } from '$eth/utils/token.utils';
import { utxoTxIdToString } from '$icp/utils/btc.utils';
import { i18n } from '$lib/stores/i18n.store';
import {
	CHAIN_FUSION_EXTERNAL_REF_KEYS,
	type ChainFusionExternalRefKey
} from '$lib/types/chain-fusion-swap';
import { SwapProvider } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { toBackendTokenId } from '$lib/utils/token-id.utils';
import { assertNever, isNullish, nonNullish } from '@dfinity/utils';
import type { CkBtcMinterDid } from '@icp-sdk/canisters/ckbtc';
import { encodePrincipalToEthAddress, type CkEthMinterDid } from '@icp-sdk/canisters/cketh';
import type { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';

export const isChainFusionActiveUserTransaction = (tx: ActiveUserTransaction): boolean =>
	'ChainFusion' in tx.data;

/**
 * The two directions whose settlement is observed from the *deposit* side rather
 * than asked of the minter: the ckETH minter has no per-deposit status endpoint,
 * so a mint is followed exactly as the Convert flow's virtual transaction is —
 * see `toChainFusionMintStatus`.
 */
export const isChainFusionMintDirection = (direction: ChainFusionDirection): boolean =>
	'EthToCkEth' in direction || 'Erc20ToCkErc20' in direction;

/**
 * The two directions the ckETH minter answers exactly, keyed on a ledger burn
 * index. `CkBtcToBtc` is deliberately excluded: it is also a withdrawal, but it
 * is a different minter answering a different question, and asking the ckETH
 * minter about it would be nonsense — it gets its own routing below.
 */
export const isChainFusionEthWithdrawalDirection = (direction: ChainFusionDirection): boolean =>
	'CkEthToEth' in direction || 'CkErc20ToErc20' in direction;

/**
 * The one direction whose poller has to *mutate*: the ckBTC minter credits
 * nothing until someone calls `update_balance`, so a read-only poll would leave
 * the deposit sitting at the deposit address forever.
 */
export const isChainFusionBtcMintDirection = (direction: ChainFusionDirection): boolean =>
	'BtcToCkBtc' in direction;

// ckBTC → BTC: exact, query-only, keyed on the `retrieve_btc_with_approval` index.
export const isChainFusionBtcWithdrawalDirection = (direction: ChainFusionDirection): boolean =>
	'CkBtcToBtc' in direction;

/**
 * Builds the `ChainFusion` AUT data variant: the direction discriminant plus the
 * canonical immutable trio (source token, destination token, source amount in
 * base units). Every settlement pointer — block indices, the deposit tx hash and
 * block number, the minter and helper-contract addresses — rides in
 * `external_refs`, which need no Candid change to extend.
 *
 * Returns `undefined` when either token has no backend `TokenId`, which callers
 * treat as "do not track this conversion" rather than as a failure.
 */
export const toChainFusionData = ({
	direction,
	sourceToken,
	destinationToken,
	amount
}: {
	direction: ChainFusionDirection;
	sourceToken: Token;
	destinationToken: Token;
	amount: bigint;
}): ActiveUserTransactionData | undefined => {
	const source_token = toBackendTokenId(sourceToken);
	const dest_token = toBackendTokenId(destinationToken);

	if (nonNullish(source_token) && nonNullish(dest_token)) {
		return { ChainFusion: { direction, source_token, dest_token, amount } };
	}
};

/**
 * Builds a deterministic `(key, value)` external-ref array, dropping empties.
 * Mirrors `toVeloraExternalRefs`.
 */
export const toChainFusionExternalRefs = (
	refs: Partial<Record<ChainFusionExternalRefKey, string>>
): ActiveUserTransactionRef[] =>
	(Object.keys(refs) as ChainFusionExternalRefKey[])
		.filter((key) => refs[key] !== undefined && refs[key] !== '')
		.sort()
		.map((key) => ({ key, value: refs[key] as string }));

// Wire-format `(key, value)` array → keyed lookup.
export const toChainFusionExternalRefsMap = (
	refs: ActiveUserTransactionRef[]
): Partial<Record<ChainFusionExternalRefKey, string>> => {
	const map: Partial<Record<ChainFusionExternalRefKey, string>> = {};

	for (const { key, value } of refs) {
		map[key as ChainFusionExternalRefKey] = value;
	}

	return map;
};

/**
 * Snapshots the user-facing fields needed to render an AUT row and to fire its
 * terminal-state analytics. Uses OneSec's key names, which is what lets
 * `ActiveUserTransactionItem` render a Chain Fusion row without a new layout.
 */
export const toChainFusionDisplayRefs = ({
	sourceToken,
	destinationToken,
	amount,
	usdSourceValue
}: {
	sourceToken: Token;
	destinationToken: Token;
	amount: string;
	usdSourceValue?: string;
}): Partial<Record<ChainFusionExternalRefKey, string>> => ({
	[CHAIN_FUSION_EXTERNAL_REF_KEYS.AMOUNT]: amount,
	...(nonNullish(usdSourceValue)
		? { [CHAIN_FUSION_EXTERNAL_REF_KEYS.USD_SOURCE_VALUE]: usdSourceValue }
		: {}),
	[CHAIN_FUSION_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL]: sourceToken.symbol,
	[CHAIN_FUSION_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL]: sourceToken.network.name,
	[CHAIN_FUSION_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL]: destinationToken.symbol,
	[CHAIN_FUSION_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL]: destinationToken.network.name
});

/**
 * Maps the ckETH minter's withdrawal status to the AUT status enum.
 *
 * `NotFound` is deliberately **not** a failure: a withdrawal reads as `NotFound`
 * in the window between the ledger burn and the minter indexing the request, so
 * mapping it to `Failed` would terminalize nearly every withdrawal wrongly — and
 * terminal states are immutable, so there is no recovery from that.
 *
 * `TxFinalized` splits on its own payload: `Success` succeeded, while
 * `Reimbursed` and `PendingReimbursement` mean the Ethereum transaction failed
 * and the user is getting their ckETH back. `PendingReimbursement` is terminal
 * for our purposes — the verdict is settled even though the refund has not
 * landed yet, and unlike Velora's `REFUNDING` there is no later hash to learn.
 */
export const toChainFusionWithdrawalStatus = (
	status: CkEthMinterDid.RetrieveEthStatus
): ActiveUserTransactionStatus | undefined => {
	if ('TxFinalized' in status) {
		return 'Success' in status.TxFinalized ? { Succeeded: null } : { Failed: null };
	}

	if ('TxSent' in status || 'TxCreated' in status || 'Pending' in status) {
		return { Executing: null };
	}

	if ('NotFound' in status) {
		// The minter has not indexed the burn yet. Leave the row alone.
		return undefined;
	}

	// As in `toChainFusionBtcWithdrawalStatus`: a status added to the SDK since this was
	// written must not silently read as the no-op above.
	assertNever(status, 'Unexpected ckETH withdrawal status');
};

export const chainFusionWithdrawalStatusError = (
	status: CkEthMinterDid.RetrieveEthStatus
): string | undefined => {
	if ('TxFinalized' in status && !('Success' in status.TxFinalized)) {
		return get(i18n).swap.error.swap_refunded;
	}

	return undefined;
};

// The Ethereum transaction the minter sent, revealed as soon as it is broadcast.
export const toChainFusionWithdrawalLearnedRefs = (
	status: CkEthMinterDid.RetrieveEthStatus
): Partial<Record<ChainFusionExternalRefKey, string>> => {
	if ('TxSent' in status) {
		return {
			[CHAIN_FUSION_EXTERNAL_REF_KEYS.WITHDRAWAL_TX_HASH]: status.TxSent.transaction_hash
		};
	}

	if ('TxFinalized' in status) {
		const { TxFinalized } = status;

		const hash =
			'Success' in TxFinalized
				? TxFinalized.Success.transaction_hash
				: 'PendingReimbursement' in TxFinalized
					? TxFinalized.PendingReimbursement.transaction_hash
					: TxFinalized.Reimbursed.transaction_hash;

		return { [CHAIN_FUSION_EXTERNAL_REF_KEYS.WITHDRAWAL_TX_HASH]: hash };
	}

	return {};
};

/**
 * Maps the ckBTC minter's withdrawal status to the AUT status enum.
 *
 * `Unknown` is the ckBTC counterpart of the ckETH minter's `NotFound`, and is
 * treated the same way: the minter reports it in the window between the ledger
 * burn and the minter indexing the request — and, for a long-abandoned row,
 * after the minter has pruned its history — so mapping it to `Failed` would
 * terminalize withdrawals wrongly, irreversibly.
 *
 * `WillReimburse` is terminal here even though the refund has not landed yet:
 * the verdict is settled and there is nothing further to learn, the same call
 * `toChainFusionWithdrawalStatus` makes for the ckETH minter's
 * `PendingReimbursement`. It deliberately differs from the transaction list,
 * which keeps such a burn *pending* until the reimbursement shows up — that view
 * is about the ledger entry, this one about whether the conversion is over.
 */
export const toChainFusionBtcWithdrawalStatus = (
	status: CkBtcMinterDid.RetrieveBtcStatusV2
): ActiveUserTransactionStatus | undefined => {
	if ('Confirmed' in status) {
		return { Succeeded: null };
	}

	if ('AmountTooLow' in status || 'Reimbursed' in status || 'WillReimburse' in status) {
		return { Failed: null };
	}

	if ('Pending' in status || 'Signing' in status || 'Sending' in status || 'Submitted' in status) {
		return { Executing: null };
	}

	if ('Unknown' in status) {
		// The minter has nothing on this withdrawal. Leave the row alone.
		return undefined;
	}

	// A status the minter has grown since this was written must not read as the no-op above:
	// were it terminal, the row would stay `Executing` for good. Throwing surfaces it in the
	// poller's per-row catch, which leaves the row pending exactly as a no-op would.
	assertNever(status, 'Unexpected ckBTC withdrawal status');
};

export const chainFusionBtcWithdrawalStatusError = (
	status: CkBtcMinterDid.RetrieveBtcStatusV2
): string | undefined => {
	if ('Reimbursed' in status || 'WillReimburse' in status) {
		return get(i18n).swap.error.swap_refunded;
	}

	if ('AmountTooLow' in status) {
		return get(i18n).swap.error.failed_unexpectedly;
	}

	return undefined;
};

// The Bitcoin transaction the minter sent, revealed as soon as it is broadcast.
export const toChainFusionBtcWithdrawalLearnedRefs = (
	status: CkBtcMinterDid.RetrieveBtcStatusV2
): Partial<Record<ChainFusionExternalRefKey, string>> => {
	const txid =
		'Submitted' in status
			? status.Submitted.txid
			: 'Sending' in status
				? status.Sending.txid
				: 'Confirmed' in status
					? status.Confirmed.txid
					: undefined;

	return nonNullish(txid)
		? { [CHAIN_FUSION_EXTERNAL_REF_KEYS.BTC_TXID]: utxoTxIdToString(txid) }
		: {};
};

/**
 * What the Bitcoin side plus the ckBTC minter say about a deposit.
 *
 * `unseen` → `awaitingConfirmations` → `awaitingMint` are the in-flight shapes,
 * in the order a deposit passes through them; `minted` and `rejected` are the
 * verdict, and only the minter itself can produce either.
 */
export type ChainFusionBtcMintOutcome =
	'unseen' | 'awaitingConfirmations' | 'awaitingMint' | 'minted' | 'rejected';

/**
 * Maps a ckBTC deposit's observed state to the AUT status enum.
 *
 * Unlike the Ethereum family's mints, this one is not observed from the deposit
 * side: the minter is the only party that can turn a confirmed UTXO into ckBTC,
 * so the poller's job is to make it, and the verdict is whatever it reports back
 * — see `resolveChainFusionBtcMintOutcome`.
 */
export const chainFusionBtcMintOutcomeToStatus = (
	outcome: ChainFusionBtcMintOutcome
): ActiveUserTransactionStatus | undefined => {
	switch (outcome) {
		case 'minted':
			return { Succeeded: null };
		case 'rejected':
			return { Failed: null };
		case 'unseen':
		case 'awaitingConfirmations':
		case 'awaitingMint':
			return { Executing: null };
	}
};

export const chainFusionBtcMintOutcomeError = (
	outcome: ChainFusionBtcMintOutcome
): string | undefined =>
	outcome === 'rejected' ? get(i18n).swap.error.failed_unexpectedly : undefined;

/**
 * Reads the verdict for one deposit out of an `update_balance` response, which
 * covers *every* pending UTXO of the account and not only this row's.
 *
 * `Checked` is not a verdict: the UTXO passed the Bitcoin check but the ledger
 * was unavailable, and a later `update_balance` mints it. `undefined` means the
 * response said nothing about this deposit — another of the user's UTXOs was
 * what the minter had to process — which must leave the row pending.
 */
export const toChainFusionBtcMintOutcome = ({
	utxosStatuses,
	txid
}: {
	utxosStatuses: CkBtcMinterDid.UtxoStatus[];
	txid: string;
}): ChainFusionBtcMintOutcome | undefined => {
	const status = utxosStatuses.find((utxosStatus) =>
		isSameUtxoTxid({ utxo: toUtxoStatusUtxo(utxosStatus), txid })
	);

	if (isNullish(status)) {
		return undefined;
	}

	if ('Minted' in status) {
		return 'minted';
	}

	return 'Checked' in status ? 'awaitingMint' : 'rejected';
};

const toUtxoStatusUtxo = (utxosStatus: CkBtcMinterDid.UtxoStatus): CkBtcMinterDid.Utxo =>
	'Minted' in utxosStatus
		? utxosStatus.Minted.utxo
		: 'Checked' in utxosStatus
			? utxosStatus.Checked
			: 'Tainted' in utxosStatus
				? utxosStatus.Tainted
				: utxosStatus.ValueTooSmall;

// Minter and Bitcoin-canister UTXOs carry the txid in internal byte order; the
// row snapshots the human-readable one the signer returned.
export const isSameUtxoTxid = ({
	utxo: {
		outpoint: { txid: utxoTxid }
	},
	txid
}: {
	utxo: { outpoint: { txid: Uint8Array } };
	txid: string;
}): boolean => utxoTxIdToString(utxoTxid).toLowerCase() === txid.toLowerCase();

/**
 * What the Ethereum side plus the minter's scan progress say about a ck deposit.
 *
 * `notMined` and `notObserved` are the two in-flight shapes; `deposited` and
 * `notDeposited` are the verdict, and are only ever reached once the minter has
 * scanned past the deposit's block.
 */
export type ChainFusionMintOutcome =
	'notMined' | 'reverted' | 'notObserved' | 'deposited' | 'notDeposited';

/**
 * Maps a ck deposit's observed state to the AUT status enum.
 *
 * This is the durable form of the Convert flow's virtual transaction. There, a
 * deposit is synthesized into a pending `IcTransactionUi` for as long as
 * `getLogs(startBlock = last_observed_block_number)` still returns its log —
 * i.e. for as long as the minter has not consumed the block — and the row is
 * retired once the minter passes it and the real minted ICRC transaction arrives
 * from the index canister (`icp-eth/services/eth.services.ts:150`).
 *
 * The same two signals decide the verdict here, in the order that keeps it
 * honest: while the minter has not reached the deposit's block the row is
 * `Executing`, and once it has, the helper-contract log is what says whether
 * there was a deposit to mint at all. That last check is why this is not the
 * bare block-number heuristic: a transaction that mined but emitted no log for
 * this principal — wrong contract, malformed calldata, a quarantined deposit —
 * terminalizes as `Failed` instead of claiming a mint that never happened.
 */
export const chainFusionMintOutcomeToStatus = (
	outcome: ChainFusionMintOutcome
): ActiveUserTransactionStatus | undefined => {
	switch (outcome) {
		case 'deposited':
			return { Succeeded: null };
		case 'reverted':
		case 'notDeposited':
			return { Failed: null };
		case 'notMined':
		case 'notObserved':
			return { Executing: null };
	}
};

export const chainFusionMintOutcomeError = (
	outcome: ChainFusionMintOutcome
): string | undefined => {
	if (outcome === 'reverted' || outcome === 'notDeposited') {
		return get(i18n).swap.error.failed_unexpectedly;
	}

	return undefined;
};

/**
 * The `getLogs` topic filter that identifies *this user's* deposits at a ck
 * helper contract, byte for byte the filter
 * `loadCkEthereumPendingTransactions` builds for the virtual transaction.
 *
 * ckETH: `[signature, <any sender>, principal]`. ckERC20 inserts the ERC20
 * contract the deposit was made in: `[signature, erc20, <any sender>, principal]`.
 */
export const toChainFusionDepositLogTopics = ({
	principal,
	erc20ContractAddress
}: {
	principal: Principal;
	erc20ContractAddress?: EthAddress;
}): (string | null)[] => {
	const to = encodePrincipalToEthAddress(principal);

	return nonNullish(erc20ContractAddress)
		? [CKERC20_HELPER_CONTRACT_SIGNATURE, tokenAddressToHex(erc20ContractAddress), null, to]
		: [CKETH_HELPER_CONTRACT_SIGNATURE, null, to];
};

/**
 * Builds the analytics metadata for a Chain Fusion AUT row that has just reached
 * a terminal status. Same shape as `buildVeloraSwapTrackingMetadata`, resolved
 * entirely off the row's snapshot so it survives refresh / cross-session resume.
 *
 * `dApp` is the provider, not the direction: a ck conversion started from the
 * Swap modal belongs in the swap funnel, and the Convert flow keeps firing its
 * own `TRACK_COUNT_CONVERT_*` events untouched.
 */
export const buildChainFusionSwapTrackingMetadata = ({
	tx
}: {
	tx: ActiveUserTransaction;
}): Record<string, string> => {
	const refs = toChainFusionExternalRefsMap(tx.external_refs);

	return {
		sourceToken: refs[CHAIN_FUSION_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL] ?? '',
		destinationToken: refs[CHAIN_FUSION_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL] ?? '',
		dApp: SwapProvider.CHAIN_FUSION,
		tokenAmount: refs[CHAIN_FUSION_EXTERNAL_REF_KEYS.AMOUNT] ?? '',
		// Snapshotted at commit time, so it matches the `swap_submitted` the wizard
		// fired for the same conversion rather than the rate at settlement.
		usdSourceValue: refs[CHAIN_FUSION_EXTERNAL_REF_KEYS.USD_SOURCE_VALUE] ?? '',
		sourceNetwork: refs[CHAIN_FUSION_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL] ?? '',
		destinationNetwork: refs[CHAIN_FUSION_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL] ?? '',
		...(nonNullish(tx.error[0]) ? { error: tx.error[0] } : {})
	};
};
