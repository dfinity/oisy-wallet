import type {
	ActiveUserTransaction,
	ChainFusionData,
	TokenId
} from '$declarations/backend/backend.did';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { infuraCkETHProviders } from '$eth/providers/infura-cketh.providers';
import { infuraProviders } from '$eth/providers/infura.providers';
import type { EthAddress } from '$eth/types/address';
import { minterInfo } from '$icp-eth/api/cketh-minter.api';
import { retrieveEthStatus } from '$icp/api/cketh-minter.api';
import { applyActiveUserTransactionPollUpdate } from '$lib/services/active-user-transactions.services';
import {
	CHAIN_FUSION_EXTERNAL_REF_KEYS,
	type ChainFusionExternalRefKey
} from '$lib/types/chain-fusion-swap';
import { advanceStatus } from '$lib/utils/active-user-transactions.utils';
import {
	chainFusionMintOutcomeError,
	chainFusionMintOutcomeToStatus,
	chainFusionWithdrawalStatusError,
	isChainFusionEthWithdrawalDirection,
	isChainFusionMintDirection,
	toChainFusionDepositLogTopics,
	toChainFusionExternalRefs,
	toChainFusionExternalRefsMap,
	toChainFusionWithdrawalLearnedRefs,
	toChainFusionWithdrawalStatus,
	type ChainFusionMintOutcome
} from '$lib/utils/chain-fusion-swap-active-tx.utils';
import { consoleError } from '$lib/utils/console.utils';
import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
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

// One minter-info read serves every row sharing a minter within a tick.
type MinterInfoCache = Map<string, Promise<CkEthMinterDid.MinterInfo>>;

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
	candidate: ReturnType<typeof toChainFusionWithdrawalStatus>;
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
const pollChainFusionWithdrawal = async ({
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
	minterInfoCache
}: {
	identity: Identity;
	data: ChainFusionData;
	refs: Partial<Record<ChainFusionExternalRefKey, string>>;
	minterInfoCache: MinterInfoCache;
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

	const infoPromise =
		minterInfoCache.get(minterCanisterId) ??
		minterInfo({ identity, minterCanisterId, certified: false });
	minterInfoCache.set(minterCanisterId, infoPromise);

	const lastObservedBlockNumber = fromNullable((await infoPromise).last_observed_block_number);

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
	minterInfoCache
}: {
	tx: ActiveUserTransaction;
	identity: Identity;
	data: ChainFusionData;
	refs: Partial<Record<ChainFusionExternalRefKey, string>>;
	minterInfoCache: MinterInfoCache;
}): Promise<void> => {
	const resolved = await resolveChainFusionMintOutcome({ identity, data, refs, minterInfoCache });

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
 * The withdrawal directions ask the minter and get an exact answer; the mint
 * directions are observed from the deposit side. Bitcoin's two directions are not
 * handled yet: no code path can create such a row, since `enabledPairs` admits no
 * Bitcoin twin.
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

	const minterInfoCache: MinterInfoCache = new Map();

	await Promise.all(
		transactions.map(async (tx) => {
			try {
				if (!('ChainFusion' in tx.data)) {
					return;
				}

				const { ChainFusion: data } = tx.data;

				const refs = toChainFusionExternalRefsMap(tx.external_refs);

				if (isChainFusionMintDirection(data.direction)) {
					await pollChainFusionMint({ tx, identity, data, refs, minterInfoCache });
					return;
				}

				if (isChainFusionEthWithdrawalDirection(data.direction)) {
					await pollChainFusionWithdrawal({ tx, identity, refs });
				}
			} catch (err: unknown) {
				// A transient RPC or canister blip must leave the row pending so the next
				// tick retries; one failing row never poisons the batch.
				consoleError(err);
			}
		})
	);
};
