import type {
	ActiveUserTransaction,
	ActiveUserTransactionStatus,
	ChainFusionData,
	TokenId
} from '$declarations/backend/backend.did';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { BITCOIN_CANISTER_IDS } from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import { infuraCkETHProviders } from '$eth/providers/infura-cketh.providers';
import { infuraProviders } from '$eth/providers/infura.providers';
import type { EthAddress } from '$eth/types/address';
import { minterInfo } from '$icp-eth/api/cketh-minter.api';
import { getUtxosQuery } from '$icp/api/bitcoin.api';
import {
	minterInfo as ckBtcMinterInfo,
	getKnownUtxos,
	updateBalance,
	withdrawalStatuses
} from '$icp/api/ckbtc-minter.api';
import { retrieveEthStatus } from '$icp/api/cketh-minter.api';
import { CHAIN_FUSION_UPDATE_BALANCE_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { applyActiveUserTransactionPollUpdate } from '$lib/services/active-user-transactions.services';
import {
	CHAIN_FUSION_EXTERNAL_REF_KEYS,
	type ChainFusionExternalRefKey
} from '$lib/types/chain-fusion-swap';
import { advanceStatus } from '$lib/utils/active-user-transactions.utils';
import {
	chainFusionBtcMintOutcomeError,
	chainFusionBtcMintOutcomeToStatus,
	chainFusionBtcWithdrawalStatusError,
	chainFusionMintOutcomeError,
	chainFusionMintOutcomeToStatus,
	chainFusionWithdrawalStatusError,
	isChainFusionBtcMintDirection,
	isChainFusionBtcWithdrawalDirection,
	isChainFusionEthWithdrawalDirection,
	isChainFusionMintDirection,
	isSameUtxoTxid,
	toChainFusionBtcMintOutcome,
	toChainFusionBtcWithdrawalLearnedRefs,
	toChainFusionBtcWithdrawalStatus,
	toChainFusionDepositLogTopics,
	toChainFusionExternalRefs,
	toChainFusionExternalRefsMap,
	toChainFusionWithdrawalLearnedRefs,
	toChainFusionWithdrawalStatus,
	type ChainFusionBtcMintOutcome,
	type ChainFusionMintOutcome
} from '$lib/utils/chain-fusion-swap-active-tx.utils';
import { consoleError } from '$lib/utils/console.utils';
import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
import {
	MinterNoNewUtxosError,
	type BitcoinDid,
	type BitcoinNetwork,
	type CkBtcMinterDid,
	type RetrieveBtcStatusV2WithId
} from '@icp-sdk/canisters/ckbtc';
import type { CkEthMinterDid } from '@icp-sdk/canisters/cketh';
import type { Identity } from '@icp-sdk/core/agent';

/**
 * Counts how many consecutive polls have found no deposit log in the block a ck
 * deposit mined in, once the minter has already scanned past it.
 *
 * Only the *absence*-based verdict is guarded. `deposited` rests on positive
 * evidence — the helper-contract log is there — while `notDeposited` rests on
 * evidence not being there, which is also what a transiently lagging Infura node
 * produces. Writing `Failed` on that would be a permanent wrong verdict on a
 * conversion that actually settled.
 *
 * Deliberately in-memory, as in `velora-active-tx.services`: a refresh resets the
 * count, which at worst delays terminalization by one tick and never produces a
 * wrong verdict.
 */
const missingDepositLogObservations = new Map<string, number>();

// Test seam — module-level state would otherwise leak between cases.
export const resetChainFusionMissingDepositLogObservations = (): void => {
	missingDepositLogObservations.clear();
};

const MISSING_DEPOSIT_LOG_OBSERVATIONS_REQUIRED = 2;

const recordMissingDepositLogObservation = (txId: string): number => {
	const count = (missingDepositLogObservations.get(txId) ?? 0) + 1;
	missingDepositLogObservations.set(txId, count);
	return count;
};

/**
 * Tracks when each pending ckBTC-deposit row last asked the minter to mint.
 *
 * `update_balance` is an update call while the poller ticks every few seconds, and
 * the app-wide `CkBTCUpdateBalanceWorker` is very likely calling it for the same
 * account anyway — so the throttle is the outer bound on how often a row nudges
 * the minter, on top of the query gate that skips the call entirely while the
 * deposit is still gathering confirmations. Precedent: `shouldNotifyForwarding`
 * in `onesec-swap.services`.
 *
 * In-memory on purpose, like OneSec's: a refresh resets it, which at worst costs
 * one extra idempotent update call.
 */
const lastUpdateBalanceMs = new Map<string, number>();

export const resetChainFusionUpdateBalanceThrottle = (): void => {
	lastUpdateBalanceMs.clear();
};

const shouldCallUpdateBalance = (txId: string): boolean => {
	const now = Date.now();
	const last = lastUpdateBalanceMs.get(txId);

	if (nonNullish(last) && now - last < CHAIN_FUSION_UPDATE_BALANCE_INTERVAL_MILLIS) {
		return false;
	}

	lastUpdateBalanceMs.set(txId, now);

	return true;
};

/**
 * One read per (minter, account) serves every row that shares it within a tick —
 * the ckETH minter's scan position, the ckBTC minter's confirmation floor, the
 * whole list of ckBTC withdrawal statuses, and the UTXO sets a ckBTC deposit is
 * looked up in.
 */
interface ChainFusionPollCaches {
	ckEthMinterInfo: Map<string, Promise<CkEthMinterDid.MinterInfo>>;
	ckBtcMinterInfo: Map<string, Promise<CkBtcMinterDid.MinterInfo>>;
	btcWithdrawalStatuses: Map<string, Promise<RetrieveBtcStatusV2WithId[]>>;
	btcKnownUtxos: Map<string, Promise<CkBtcMinterDid.Utxo[]>>;
	btcDepositUtxos: Map<string, Promise<BitcoinDid.get_utxos_response>>;
}

const initChainFusionPollCaches = (): ChainFusionPollCaches => ({
	ckEthMinterInfo: new Map(),
	ckBtcMinterInfo: new Map(),
	btcWithdrawalStatuses: new Map(),
	btcKnownUtxos: new Map(),
	btcDepositUtxos: new Map()
});

const memoize = <T>({
	cache,
	key,
	load
}: {
	cache: Map<string, Promise<T>>;
	key: string;
	load: () => Promise<T>;
}): Promise<T> => {
	const cached = cache.get(key);

	if (nonNullish(cached)) {
		return cached;
	}

	const promise = load();
	cache.set(key, promise);

	return promise;
};

const applyUpdate = async ({
	identity,
	tx,
	candidate,
	error,
	learned,
	refs
}: {
	identity: Identity;
	tx: ActiveUserTransaction;
	candidate: ActiveUserTransactionStatus | undefined;
	error: string | undefined;
	learned: Partial<Record<ChainFusionExternalRefKey, string>>;
	refs: Partial<Record<ChainFusionExternalRefKey, string>>;
}): Promise<void> => {
	const next = nonNullish(candidate) ? advanceStatus({ current: tx.status, candidate }) : undefined;

	// Persist newly-learned pointers even when the status itself doesn't advance.
	// `external_refs` replaces the stored list wholesale, so the merge is required.
	const hasNewRefs = (Object.keys(learned) as ChainFusionExternalRefKey[]).some(
		(key) => refs[key] !== learned[key]
	);
	const externalRefs = hasNewRefs ? toChainFusionExternalRefs({ ...refs, ...learned }) : undefined;

	const update = {
		...(nonNullish(next) ? { status: next } : {}),
		...(nonNullish(next) && 'Failed' in next && nonNullish(error) ? { error } : {}),
		...(nonNullish(externalRefs) ? { externalRefs } : {})
	};

	if (Object.keys(update).length === 0) {
		return;
	}

	await applyActiveUserTransactionPollUpdate({ identity, tx, update });
};

/**
 * ckETH → ETH and ckERC20 → ERC20. The minter answers exactly, keyed on the ckETH
 * ledger burn index snapshotted at creation, so the row resumes across refresh /
 * logout with nothing held in memory.
 */
const pollChainFusionEthWithdrawal = async ({
	tx,
	identity,
	refs
}: {
	tx: ActiveUserTransaction;
	identity: Identity;
	refs: Partial<Record<ChainFusionExternalRefKey, string>>;
}): Promise<void> => {
	const minterCanisterId = refs[CHAIN_FUSION_EXTERNAL_REF_KEYS.MINTER_CANISTER_ID];
	const blockIndex = refs[CHAIN_FUSION_EXTERNAL_REF_KEYS.CKETH_BLOCK_INDEX];

	// Not pollable without the minter or the burn index.
	if (isNullish(minterCanisterId) || isNullish(blockIndex)) {
		return;
	}

	const status = await retrieveEthStatus({
		identity,
		minterCanisterId,
		blockIndex: BigInt(blockIndex)
	});

	await applyUpdate({
		identity,
		tx,
		candidate: toChainFusionWithdrawalStatus(status),
		error: chainFusionWithdrawalStatusError(status),
		learned: toChainFusionWithdrawalLearnedRefs(status),
		refs
	});
};

/**
 * ckBTC → BTC. Exact and query-only, keyed on the block index
 * `retrieve_btc_with_approval` returned.
 *
 * The minter answers per account rather than per withdrawal, so one round-trip
 * serves every ckBTC row of this user within a tick — the same sharing
 * `pollOneSecActiveUserTransactions` does with its `getTransfers` call.
 */
const pollChainFusionBtcWithdrawal = async ({
	tx,
	identity,
	refs,
	caches
}: {
	tx: ActiveUserTransaction;
	identity: Identity;
	refs: Partial<Record<ChainFusionExternalRefKey, string>>;
	caches: ChainFusionPollCaches;
}): Promise<void> => {
	const minterCanisterId = refs[CHAIN_FUSION_EXTERNAL_REF_KEYS.MINTER_CANISTER_ID];
	const blockIndex = refs[CHAIN_FUSION_EXTERNAL_REF_KEYS.RETRIEVE_BTC_BLOCK_INDEX];

	// Not pollable without the minter or the withdrawal index.
	if (isNullish(minterCanisterId) || isNullish(blockIndex)) {
		return;
	}

	const statuses = await memoize({
		cache: caches.btcWithdrawalStatuses,
		key: minterCanisterId,
		load: () => withdrawalStatuses({ identity, minterCanisterId, certified: false })
	});

	const status = statuses.find(({ id }) => id === BigInt(blockIndex))?.status;

	// The minter has not indexed the burn yet — or, for an old row, has pruned it.
	// Either way there is nothing to advance on.
	if (isNullish(status)) {
		return;
	}

	await applyUpdate({
		identity,
		tx,
		candidate: toChainFusionBtcWithdrawalStatus(status),
		error: chainFusionBtcWithdrawalStatusError(status),
		learned: toChainFusionBtcWithdrawalLearnedRefs(status),
		refs
	});
};

// Chain Fusion swaps are mainnet-only, but the row states its own network rather
// than assuming it: `data` is what the poller is allowed to trust.
const toBitcoinNetwork = (token: TokenId): BitcoinNetwork | undefined =>
	'BtcNativeMainnet' in token ? 'mainnet' : 'BtcNativeTestnet' in token ? 'testnet' : undefined;

/**
 * How many confirmations the deposit has, or `undefined` while the Bitcoin
 * canister does not know the transaction yet — it indexes blocks, so a freshly
 * broadcast deposit is absent from its UTXO set rather than listed at zero.
 */
const resolveBtcDepositConfirmations = async ({
	identity,
	bitcoinCanisterId,
	network,
	address,
	txid,
	caches
}: {
	identity: Identity;
	bitcoinCanisterId: string;
	network: BitcoinNetwork;
	address: string;
	txid: string;
	caches: ChainFusionPollCaches;
}): Promise<number | undefined> => {
	const { utxos, tip_height } = await memoize({
		cache: caches.btcDepositUtxos,
		key: `${bitcoinCanisterId}:${address}`,
		load: () => getUtxosQuery({ identity, bitcoinCanisterId, network, address })
	});

	const utxo = utxos.find((utxo) => isSameUtxoTxid({ utxo, txid }));

	return nonNullish(utxo) ? tip_height - utxo.height + 1 : undefined;
};

/**
 * Resolves a ckBTC deposit's state, and — this is the one poller in the codebase
 * that mutates — asks the minter to mint when the deposit is ready for it.
 *
 * The ckBTC minter credits nothing until someone calls `update_balance`, so a
 * read-only poll would leave a deposit stranded at the deposit address for good.
 * The call is gated twice over, because it is an update call the app-wide
 * `CkBTCUpdateBalanceWorker` is very likely making for the same account anyway
 * (`update_balance` is idempotent, so two callers are safe — just wasteful):
 *
 * 1. A query gate, the same one the worker's scheduler uses: the minter's known
 *    UTXOs settle the row outright, and the Bitcoin canister's view of the deposit
 *    address says whether the deposit has reached the minter's confirmation floor.
 *    Below it, `update_balance` could only answer `NoNewUtxos`.
 * 2. A per-row throttle as the outer bound.
 *
 * The verdict is the minter's own: whatever `update_balance` reports for this
 * deposit. A row that is already in the minter's known-UTXO set has been consumed
 * — by an earlier call of ours, by the worker, or by another session — and counts
 * as minted; that is the one coarse step here, and it is bounded to "the minter
 * took these exact coins off the deposit address", not to a scan position.
 *
 * Nothing is ever terminalized on an `update_balance` failure: the row stays
 * pending so the next tick retries, exactly as OneSec leaves an unknown outcome
 * pending rather than dropping the row out of the poll set.
 */
const resolveChainFusionBtcMintOutcome = async ({
	identity,
	txId,
	data,
	refs,
	caches
}: {
	identity: Identity;
	txId: string;
	data: ChainFusionData;
	refs: Partial<Record<ChainFusionExternalRefKey, string>>;
	caches: ChainFusionPollCaches;
}): Promise<ChainFusionBtcMintOutcome | undefined> => {
	const minterCanisterId = refs[CHAIN_FUSION_EXTERNAL_REF_KEYS.MINTER_CANISTER_ID];
	const txid = refs[CHAIN_FUSION_EXTERNAL_REF_KEYS.BTC_TXID];
	const depositAddress = refs[CHAIN_FUSION_EXTERNAL_REF_KEYS.BTC_DEPOSIT_ADDRESS];

	// Not pollable without the minter, the deposit or the address it went to.
	if (isNullish(minterCanisterId) || isNullish(txid) || isNullish(depositAddress)) {
		return;
	}

	const knownUtxos = await memoize({
		cache: caches.btcKnownUtxos,
		key: minterCanisterId,
		load: () => getKnownUtxos({ identity, minterCanisterId })
	});

	if (knownUtxos.some((utxo) => isSameUtxoTxid({ utxo, txid }))) {
		return 'minted';
	}

	const bitcoinCanisterId = BITCOIN_CANISTER_IDS[minterCanisterId];
	const network = toBitcoinNetwork(data.source_token);

	// The Bitcoin canister is not deployed locally, so there the confirmation gate is
	// simply skipped and the throttle carries the whole load — the same concession
	// `CkBTCUpdateBalanceScheduler.hasPendingUtxos` makes.
	if (nonNullish(bitcoinCanisterId) && nonNullish(network)) {
		const confirmations = await resolveBtcDepositConfirmations({
			identity,
			bitcoinCanisterId,
			network,
			address: depositAddress,
			txid,
			caches
		});

		if (isNullish(confirmations)) {
			return 'unseen';
		}

		const { min_confirmations } = await memoize({
			cache: caches.ckBtcMinterInfo,
			key: minterCanisterId,
			load: () => ckBtcMinterInfo({ identity, minterCanisterId, certified: false })
		});

		if (confirmations < min_confirmations) {
			return 'awaitingConfirmations';
		}
	}

	if (!shouldCallUpdateBalance(txId)) {
		return 'awaitingMint';
	}

	try {
		const utxosStatuses = await updateBalance({ identity, minterCanisterId });

		// A response that says nothing about this deposit — the minter had another of the
		// user's UTXOs to process — is not a verdict.
		return toChainFusionBtcMintOutcome({ utxosStatuses, txid }) ?? 'awaitingMint';
	} catch (err: unknown) {
		// `NoNewUtxos` is the expected answer whenever someone else got there first, so it
		// is not worth logging; every other failure is transient as far as this row is
		// concerned, and none of them may terminalize it.
		if (!(err instanceof MinterNoNewUtxosError)) {
			consoleError(err);
		}

		return 'awaitingMint';
	}
};

/**
 * BTC → ckBTC. See `resolveChainFusionBtcMintOutcome` — this is the mutating
 * branch.
 */
const pollChainFusionBtcMint = async ({
	tx,
	identity,
	data,
	refs,
	caches
}: {
	tx: ActiveUserTransaction;
	identity: Identity;
	data: ChainFusionData;
	refs: Partial<Record<ChainFusionExternalRefKey, string>>;
	caches: ChainFusionPollCaches;
}): Promise<void> => {
	const outcome = await resolveChainFusionBtcMintOutcome({
		identity,
		txId: tx.id,
		data,
		refs,
		caches
	});

	if (isNullish(outcome)) {
		return;
	}

	// A terminal row leaves the pending set, so its throttle entry has no reader left.
	if (outcome === 'minted' || outcome === 'rejected') {
		lastUpdateBalanceMs.delete(tx.id);
	}

	await applyUpdate({
		identity,
		tx,
		candidate: chainFusionBtcMintOutcomeToStatus(outcome),
		error: chainFusionBtcMintOutcomeError(outcome),
		learned: {},
		refs
	});
};

// The ERC20 the deposit was made in, needed for the ckERC20 log topic. It is part
// of the row's immutable `data`, so no ref carries it.
const toErc20ContractAddress = (token: TokenId): EthAddress | undefined =>
	'Erc20' in token ? token.Erc20[0] : undefined;

/**
 * Reads a ck deposit's state off the Ethereum side and the minter's scan
 * progress, in the order that keeps the verdict honest.
 *
 * This is the durable form of the Convert flow's virtual transaction: while the
 * minter has not scanned past the deposit's block the conversion is in flight,
 * and once it has, the helper-contract log — the very log the virtual row is built
 * from — says whether there was a deposit to mint.
 *
 * Returns the outcome plus anything worth persisting. The deposit's block number
 * is read from the receipt once and then kept, which is what lets the settlement
 * query be bounded to a single block instead of scanning to `latest`.
 */
const resolveChainFusionMintOutcome = async ({
	identity,
	data,
	refs,
	caches
}: {
	identity: Identity;
	data: ChainFusionData;
	refs: Partial<Record<ChainFusionExternalRefKey, string>>;
	caches: ChainFusionPollCaches;
}): Promise<
	| { outcome: ChainFusionMintOutcome; learned: Partial<Record<ChainFusionExternalRefKey, string>> }
	| undefined
> => {
	const depositTxHash = refs[CHAIN_FUSION_EXTERNAL_REF_KEYS.DEPOSIT_TX_HASH];
	const helperContractAddress = refs[CHAIN_FUSION_EXTERNAL_REF_KEYS.HELPER_CONTRACT_ADDRESS];
	const minterCanisterId = refs[CHAIN_FUSION_EXTERNAL_REF_KEYS.MINTER_CANISTER_ID];

	// Not pollable without the deposit, the contract it went to, or the minter.
	if (isNullish(depositTxHash) || isNullish(helperContractAddress) || isNullish(minterCanisterId)) {
		return;
	}

	const learned: Partial<Record<ChainFusionExternalRefKey, string>> = {};

	// Chain Fusion mints are Ethereum-mainnet only by construction: the quote
	// rejects any other source network, and the ck helper contracts exist nowhere
	// else — `infuraCkETHProviders` is not even built for the other EVM chains.
	let depositBlockNumber = refs[CHAIN_FUSION_EXTERNAL_REF_KEYS.DEPOSIT_BLOCK_NUMBER];

	if (isNullish(depositBlockNumber)) {
		const receipt = await infuraProviders(ETHEREUM_NETWORK_ID).getTransactionReceipt(depositTxHash);

		if (isNullish(receipt)) {
			// Still in the mempool. Nothing has been observed yet, either way.
			return { outcome: 'notMined', learned };
		}

		if (receipt.status === 0) {
			// The deposit reverted, so no funds ever reached the helper contract.
			return { outcome: 'reverted', learned };
		}

		depositBlockNumber = `${receipt.blockNumber}`;
		learned[CHAIN_FUSION_EXTERNAL_REF_KEYS.DEPOSIT_BLOCK_NUMBER] = depositBlockNumber;
	}

	const info = await memoize({
		cache: caches.ckEthMinterInfo,
		key: minterCanisterId,
		load: () => minterInfo({ identity, minterCanisterId, certified: false })
	});

	const lastObservedBlockNumber = fromNullable(info.last_observed_block_number);

	// The minter has not reported a scan position yet; there is nothing to compare
	// the deposit against, so leave the row where it is.
	if (isNullish(lastObservedBlockNumber)) {
		return { outcome: 'notObserved', learned };
	}

	// `<=`, not `<`: the Convert flow's virtual row survives while
	// `getLogs(startBlock = last_observed_block_number)` — an *inclusive* bound —
	// still returns the deposit's log, so the minter counts as past the block only
	// once the deposit's block falls strictly behind its scan position.
	if (lastObservedBlockNumber <= BigInt(depositBlockNumber)) {
		return { outcome: 'notObserved', learned };
	}

	// The minter has consumed the deposit's block — the moment the Convert flow's
	// virtual row is retired. Bounded to that single block, so an abandoned row
	// picked up weeks later costs exactly the same query as a fresh one.
	const logs = await infuraCkETHProviders(ETHEREUM_NETWORK_ID).getLogs({
		contract: { address: helperContractAddress },
		startBlock: Number(depositBlockNumber),
		endBlock: Number(depositBlockNumber),
		topics: toChainFusionDepositLogTopics({
			principal: identity.getPrincipal(),
			erc20ContractAddress: toErc20ContractAddress(data.source_token)
		})
	});

	const deposited = logs.some(
		({ transactionHash }) => transactionHash.toLowerCase() === depositTxHash.toLowerCase()
	);

	return { outcome: deposited ? 'deposited' : 'notDeposited', learned };
};

/**
 * ETH → ckETH and ERC20 → ckERC20. The ckETH minter has no per-deposit status
 * endpoint, so settlement is observed from the deposit side — see
 * `resolveChainFusionMintOutcome`.
 */
const pollChainFusionMint = async ({
	tx,
	identity,
	data,
	refs,
	caches
}: {
	tx: ActiveUserTransaction;
	identity: Identity;
	data: ChainFusionData;
	refs: Partial<Record<ChainFusionExternalRefKey, string>>;
	caches: ChainFusionPollCaches;
}): Promise<void> => {
	const resolved = await resolveChainFusionMintOutcome({ identity, data, refs, caches });

	if (isNullish(resolved)) {
		return;
	}

	const { learned } = resolved;
	let { outcome } = resolved;

	if (outcome === 'notDeposited') {
		if (recordMissingDepositLogObservation(tx.id) < MISSING_DEPOSIT_LOG_OBSERVATIONS_REQUIRED) {
			outcome = 'notObserved';
		}
	} else {
		missingDepositLogObservations.delete(tx.id);
	}

	await applyUpdate({
		identity,
		tx,
		candidate: chainFusionMintOutcomeToStatus(outcome),
		error: chainFusionMintOutcomeError(outcome),
		learned,
		refs
	});
};

/**
 * Advances the pending Chain Fusion rows, routed on the direction stored in the
 * row's immutable `data` — which is why the direction is captured at creation
 * rather than re-derived from the token pair on every tick.
 *
 * The three withdrawal directions ask a minter and get an exact answer. The two
 * Ethereum-family mints are observed from the deposit side, since the ckETH minter
 * has no per-deposit status endpoint. The ckBTC mint is the odd one out: its
 * poller has to make the minting happen, not merely watch it.
 */
export const pollChainFusionActiveUserTransactions = async ({
	identity,
	transactions
}: {
	identity: Identity;
	transactions: ActiveUserTransaction[];
}): Promise<void> => {
	if (transactions.length === 0) {
		return;
	}

	const caches = initChainFusionPollCaches();

	await Promise.all(
		transactions.map(async (tx) => {
			try {
				if (!('ChainFusion' in tx.data)) {
					return;
				}

				const { ChainFusion: data } = tx.data;

				const refs = toChainFusionExternalRefsMap(tx.external_refs);

				if (isChainFusionMintDirection(data.direction)) {
					await pollChainFusionMint({ tx, identity, data, refs, caches });
					return;
				}

				if (isChainFusionBtcMintDirection(data.direction)) {
					await pollChainFusionBtcMint({ tx, identity, data, refs, caches });
					return;
				}

				if (isChainFusionBtcWithdrawalDirection(data.direction)) {
					await pollChainFusionBtcWithdrawal({ tx, identity, refs, caches });
					return;
				}

				if (isChainFusionEthWithdrawalDirection(data.direction)) {
					await pollChainFusionEthWithdrawal({ tx, identity, refs });
				}
			} catch (err: unknown) {
				// A transient RPC or canister blip must leave the row pending so the next
				// tick retries; one failing row never poisons the batch.
				consoleError(err);
			}
		})
	);
};
