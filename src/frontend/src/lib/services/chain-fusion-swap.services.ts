import { sendBtc } from '$btc/services/btc-send.services';
import { prepareBtcSend } from '$btc/services/btc-utxos.service';
import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import type { BtcAddress } from '$btc/types/address';
import type { UtxosFee } from '$btc/types/btc-send';
import { convertNumberToSatoshis, isInvalidUtxosFee } from '$btc/utils/btc-send.utils';
import type { ChainFusionDirection } from '$declarations/backend/backend.did';
import { CHAIN_FUSION_SWAP_ENABLED } from '$env/chain-fusion-swap.env';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { send as sendEth } from '$eth/services/send.services';
import type { EthAddress } from '$eth/types/address';
import type { Erc20Token } from '$eth/types/erc20';
import type { EthereumNetwork } from '$eth/types/network';
import type { ProgressStep } from '$eth/types/send';
import { isTokenErcFungible } from '$eth/utils/erc-fungible.utils';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import type { OptionCertifiedMinterInfo } from '$icp-eth/types/cketh-minter';
import {
	toCkErc20HelperContractAddress,
	toCkEthHelperContractAddress
} from '$icp-eth/utils/cketh.utils';
import { mapAddressStartsWith0x } from '$icp-eth/utils/eth.utils';
import { estimateFee } from '$icp/api/ckbtc-minter.api';
import { eip1559TransactionPrice } from '$icp/api/cketh-minter.api';
import { icrcTokens } from '$icp/derived/icrc.derived';
import { sendIc } from '$icp/services/ic-send.services';
import { btcAddressStore } from '$icp/stores/btc.store';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import type { IcCkWithdrawalResult } from '$icp/types/ic-send';
import type { IcCkToken } from '$icp/types/ic-token';
import {
	isTokenCkBtcLedger,
	isTokenCkErc20Ledger,
	isTokenCkEthLedger
} from '$icp/utils/ic-send.utils';
import {
	ProgressStepsSend,
	ProgressStepsSendIc,
	ProgressStepsSwap
} from '$lib/enums/progress-steps';
import { createActiveUserTransaction } from '$lib/services/active-user-transactions.services';
import type { Address } from '$lib/types/address';
import type { CanisterIdText } from '$lib/types/canister';
import {
	CHAIN_FUSION_EXTERNAL_REF_KEYS,
	type ChainFusionExternalRefKey
} from '$lib/types/chain-fusion-swap';
import type { Amount } from '$lib/types/send';
import {
	SwapProvider,
	type BtcQuoteParams,
	type ChainFusionFee,
	type ChainFusionSwapDetails,
	type EvmQuoteParams,
	type IcpBridgeQuoteParams,
	type SwapMappedResult
} from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import {
	toChainFusionData,
	toChainFusionDisplayRefs,
	toChainFusionExternalRefs
} from '$lib/utils/chain-fusion-swap-active-tx.utils';
import { asCkTwinOf, computeChainFusionReceiveAmount } from '$lib/utils/chain-fusion-swap.utils';
import { consoleError } from '$lib/utils/console.utils';
import { formatToken } from '$lib/utils/format.utils';
import { isNullishOrEmpty } from '$lib/utils/input.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
import type { BitcoinNetwork } from '@icp-sdk/canisters/ckbtc';
import { AnonymousIdentity, type Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';

const resolveChainFusionEvmQuote = ({
	sourceToken,
	destinationToken,
	amount
}: EvmQuoteParams): SwapMappedResult | undefined => {
	if (!CHAIN_FUSION_SWAP_ENABLED) {
		return;
	}

	if (isNullish(asCkTwinOf({ ckToken: destinationToken, nativeToken: sourceToken }))) {
		return;
	}

	if (sourceToken.network.id !== ETHEREUM_NETWORK_ID) {
		return;
	}

	const minterInfo = get(ckEthMinterInfoStore)?.[ETHEREUM_TOKEN_ID];

	const helperContractAddress = isTokenErcFungible(sourceToken)
		? toCkErc20HelperContractAddress(minterInfo)
		: toCkEthHelperContractAddress(minterInfo);

	if (isNullish(helperContractAddress)) {
		return;
	}

	const sourceFees: ChainFusionFee[] = [];

	return {
		provider: SwapProvider.CHAIN_FUSION,
		receiveAmount: computeChainFusionReceiveAmount({ amount, sourceFees }),
		swapDetails: { sourceFees, externalFees: [] }
	};
};

/**
 * Quotes a ck mint — ETH → ckETH or ERC20 → ckERC20.
 *
 * The mint is free and 1:1: the minter credits exactly what the helper contract
 * receives. Native gas is not deducted from the receive amount because it is paid in
 * ETH rather than in the source token, and the wizard's `EthFeeContext` already owns
 * it — the same division Velora uses.
 *
 * Resolves to `undefined` rather than rejecting whenever the pair is not a ck mint we
 * can settle; the fan-out drops the offer either way.
 */
export const fetchChainFusionEvmQuote = (
	params: EvmQuoteParams
): Promise<SwapMappedResult | undefined> => Promise.resolve(resolveChainFusionEvmQuote(params));

const resolveChainFusionBtcQuote = ({
	sourceToken,
	destinationToken,
	amount,
	userBtcAddress
}: BtcQuoteParams): SwapMappedResult | undefined => {
	if (!CHAIN_FUSION_SWAP_ENABLED) {
		return;
	}

	const ckDestinationToken = asCkTwinOf({ ckToken: destinationToken, nativeToken: sourceToken });

	if (isNullish(ckDestinationToken) || sourceToken.network.id !== BTC_MAINNET_NETWORK_ID) {
		return;
	}

	const minterInfo = get(ckBtcMinterInfoStore)?.[ckDestinationToken.id];

	// The minter's per-user deposit address is a prerequisite of the *quote*, not only of
	// the send: an offer the user can accept but not execute is worse than no offer. Like
	// the minter info it is there whenever the ckBTC twin is enabled, which it is by
	// default — the update-balance worker keeps both filled app-wide.
	const depositAddress = get(btcAddressStore)?.[ckDestinationToken.id]?.data;

	if (isNullish(minterInfo) || isNullishOrEmpty(depositAddress)) {
		return;
	}

	const allUtxos = get(allUtxosStore)?.allUtxos;
	const feeRateMiliSatoshisPerVByte = get(feeRatePercentilesStore)?.feeRateFromPercentiles;

	if (isNullish(allUtxos) || isNullish(feeRateMiliSatoshisPerVByte)) {
		return;
	}

	// Synchronous, but not pure: it also reads `btcPendingSentTransactionsStore` to skip
	// UTXOs another send has already reserved, and errors when that store holds nothing
	// for this address. All three stores are filled by the loaders the swap flow mounts
	// for a Bitcoin source.
	const utxosFee = prepareBtcSend({
		amount: formatToken({
			value: amount,
			unitName: sourceToken.decimals,
			displayDecimals: sourceToken.decimals
		}),
		source: userBtcAddress,
		allUtxos,
		feeRateMiliSatoshisPerVByte
	});

	// A selection that cannot fund a broadcast must not become an offer: quoting it would
	// advertise a fee the send then refuses to honour.
	if (isInvalidUtxosFee(utxosFee)) {
		return;
	}

	// Only the KYT fee reduces what the user receives: the minter takes it out of the amount
	// it credits, which a real conversion confirmed — depositing 1 000 satoshis mints 900
	// against a 100-satoshi `kyt_fee`. The Convert flow quotes this direction 1:1 and is
	// simply wrong about it. The Bitcoin network fee is genuinely charged on top, covered out
	// of the transaction's change rather than out of the deposit.
	//
	// `BtcConvertFees`'s third row is deliberately absent: `BTC_CONVERT_FEE` is `ZERO`, and a
	// "Conversion fee — Free" line means nothing in a list of swap offers. Should the constant
	// ever become non-zero, it belongs back here as a `sourceFees` entry.
	const sourceFees: ChainFusionFee[] = [
		{
			labelPath: 'fee.text.convert_inter_network_fee',
			fee: minterInfo.data.kyt_fee,
			token: sourceToken,
			deductedFromAmount: true
		},
		{
			labelPath: 'fee.text.convert_btc_network_fee',
			fee: utxosFee.feeSatoshis,
			token: sourceToken
		}
	];

	return {
		provider: SwapProvider.CHAIN_FUSION,
		receiveAmount: computeChainFusionReceiveAmount({ amount, sourceFees }),
		swapDetails: { sourceFees, externalFees: [] }
	};
};

/**
 * Quotes a ckBTC mint — BTC → ckBTC.
 *
 * The only direction whose fee depends on the user's own coins: the Bitcoin network fee
 * falls out of which UTXOs a deposit of this size has to spend. The quote recomputes that
 * selection rather than reading `UtxosFeeContext`, which is a Svelte context the fan-out
 * cannot see; both compute the same pure function over the same stores, and the wizard's
 * copy is what the send is built from.
 *
 * No round-trip, so no `try`/`catch` and no `async` — same shape as the EVM mint quote.
 */
export const fetchChainFusionBtcQuote = (
	params: BtcQuoteParams
): Promise<SwapMappedResult | undefined> => Promise.resolve(resolveChainFusionBtcQuote(params));

/**
 * The ckETH the minter burns to cover the Ethereum transaction it sends on the user's
 * behalf, read straight from the minter's `eip_1559_transaction_price`.
 *
 * The api wrapper is called directly rather than through `loadEip1559TransactionPrice`,
 * which toasts on failure and writes to a store keyed by token id instead of returning
 * the value — a toast on every quote tick would be noise. Same reasoning, and same
 * resolution, as the raw `estimateFee` call PR 8 makes for ckBTC. The query is served
 * anonymously, exactly as `loadEip1559TransactionPrice` does.
 */
const queryMaxTransactionFee = async ({
	minterCanisterId,
	ckErc20LedgerId
}: {
	minterCanisterId: CanisterIdText;
	ckErc20LedgerId?: CanisterIdText;
}): Promise<bigint> => {
	const { max_transaction_fee } = await eip1559TransactionPrice({
		identity: new AnonymousIdentity(),
		minterCanisterId,
		certified: false,
		...(nonNullish(ckErc20LedgerId) && {
			ckErc20LedgerId: Principal.fromText(ckErc20LedgerId)
		})
	});

	return max_transaction_fee;
};

/**
 * ckETH → ETH. Both fees are denominated in ckETH, which is the source token, so both
 * belong in `sourceFees`: the ledger fee for the `icrc2_approve` leg, and the minter's
 * gas estimate.
 */
const resolveCkEthWithdrawalDetails = async (
	sourceToken: IcCkToken
): Promise<ChainFusionSwapDetails | undefined> => {
	const { minterCanisterId, fee } = sourceToken;

	if (isNullish(minterCanisterId)) {
		return;
	}

	const minterInfo = get(ckEthMinterInfoStore)?.[ETHEREUM_TOKEN_ID];

	if (isNullish(minterInfo)) {
		return;
	}

	const maxTransactionFee = await queryMaxTransactionFee({ minterCanisterId });

	return {
		sourceFees: [
			{ labelPath: 'fee.text.fee', fee, token: sourceToken },
			{
				labelPath: 'fee.text.estimated_eth',
				fee: maxTransactionFee,
				token: sourceToken
			}
		],
		externalFees: [],
		minimumAmount: fromNullable(minterInfo.data.minimum_withdrawal_amount),
		minterInfoCertified: minterInfo.certified
	};
};

/**
 * ckERC20 → ERC20. The ERC20 side is 1:1 — only the ckERC20 ledger fee comes out of the
 * source token. The gas is charged in ckETH, a token the user must hold separately,
 * which is what `externalFees` exists for.
 *
 * No minimum: validation dispatches ckERC20 to `assertCkErc20Amount`, which never reads
 * minter info, so no minter floor applies.
 */
const resolveCkErc20WithdrawalDetails = async (
	sourceToken: IcCkToken
): Promise<ChainFusionSwapDetails | undefined> => {
	const { minterCanisterId, ledgerCanisterId, feeLedgerCanisterId, fee } = sourceToken;

	if (isNullish(minterCanisterId) || isNullish(feeLedgerCanisterId)) {
		return;
	}

	const ckEthToken = get(icrcTokens).find(({ ledgerCanisterId: id }) => id === feeLedgerCanisterId);

	if (isNullish(ckEthToken)) {
		return;
	}

	const maxTransactionFee = await queryMaxTransactionFee({
		minterCanisterId,
		ckErc20LedgerId: ledgerCanisterId
	});

	return {
		sourceFees: [{ labelPath: 'fee.text.fee', fee, token: sourceToken }],
		externalFees: [
			{
				labelPath: 'fee.text.estimated_eth',
				fee: maxTransactionFee + ckEthToken.fee,
				token: ckEthToken
			}
		]
	};
};

/**
 * ckBTC → BTC. Two fees, and only one of them comes out of what the user receives: the
 * Bitcoin network and minter fees the ckBTC minter pays out of the amount it withdraws,
 * which is the `totalDestinationTokenFee` the Convert flow deducts too. The ledger fee (for
 * `icrc2_approve`) is charged beside the amount.
 *
 * `IcTokenFees`'s third row, the KYT fee, is deliberately absent: the user is not charged it
 * on this side of the pair, unlike on a deposit. Finalized withdrawals pay out exactly
 * `amount - bitcoin_fee - minter_fee`, and the minter burns the full `amount` with no check
 * fee in the memo — the Convert flow lists a fee nobody pays.
 *
 * The fee estimate depends on the amount, so unlike the Ethereum arms this query re-runs on
 * every debounced amount change. It does *not* refresh beyond that: `SwapTokenWizard` sets
 * `enableAmountUpdates` false for an ICP-network source, so the periodic refetch never runs
 * for this arm, and reaching Review pauses updates outright. The figure is therefore frozen
 * as of the user's last edit, and a long deliberation can show a stale
 * `bitcoin_fee + minter_fee` — and so a stale receive amount.
 *
 * Bounded on purpose: nothing computed here reaches execution. `fetchChainFusionIcpSwap`
 * passes only the amount, and the minter deducts whatever its fee is at that moment, so a
 * stale estimate misreports the *displayed* receive amount and never the transfer. That is
 * the same accuracy the Convert flow offers, whose `BitcoinFeeContext` is likewise only
 * amount-driven. Contrast the ckERC20 arm, where a stale figure would have the minter
 * *reject* the withdrawal — which is why that one alone is re-queried at the point of use.
 */
const resolveCkBtcWithdrawalDetails = async ({
	sourceToken,
	destinationToken,
	amount
}: {
	sourceToken: IcCkToken;
	destinationToken: Token;
	amount: bigint;
}): Promise<ChainFusionSwapDetails | undefined> => {
	const { minterCanisterId, fee } = sourceToken;

	if (isNullish(minterCanisterId)) {
		return;
	}

	const minterInfo = get(ckBtcMinterInfoStore)?.[sourceToken.id];

	if (isNullish(minterInfo)) {
		return;
	}

	// The raw api wrapper rather than `queryEstimateFee`, which toasts on failure — a
	// toast on every quote tick would be noise. Served anonymously and uncertified, like
	// the ckETH gas price read above: a quote wants the fast path.
	const { bitcoin_fee, minter_fee } = await estimateFee({
		identity: new AnonymousIdentity(),
		minterCanisterId,
		amount,
		certified: false
	});

	return {
		sourceFees: [
			{ labelPath: 'fee.text.fee', fee, token: sourceToken },
			{
				labelPath: 'fee.text.estimated_btc',
				fee: bitcoin_fee + minter_fee,
				// Denominated in BTC. ckBTC shares its decimals, so subtracting it from a ckBTC
				// amount is sound — and it is what `ConvertAmountDestination` already does.
				token: destinationToken,
				deductedFromAmount: true
			}
		],
		externalFees: [],
		minimumAmount: minterInfo.data.retrieve_btc_min_amount,
		minterInfoCertified: minterInfo.certified
	};
};

/**
 * Quotes a ck withdrawal — ckETH → ETH, ckERC20 → ERC20 or ckBTC → BTC.
 *
 * Unlike the mint side this is not free: the minter charges for the transaction it sends
 * on the user's behalf, so every arm makes a round-trip per tick. Resolves to `undefined`
 * when the pair is not a ck withdrawal we can settle.
 */
export const fetchChainFusionIcpQuote = async ({
	sourceToken,
	destinationToken,
	amount
}: IcpBridgeQuoteParams): Promise<SwapMappedResult | undefined> => {
	if (!CHAIN_FUSION_SWAP_ENABLED) {
		return;
	}

	// The withdrawal direction: the source is the ck counterpart of this destination.
	const ckSourceToken = asCkTwinOf({ ckToken: sourceToken, nativeToken: destinationToken });

	if (isNullish(ckSourceToken)) {
		return;
	}

	// The destination network is checked per arm rather than once up front, and it is
	// load-bearing on the Ethereum side: a Sepolia ck pair satisfies the `twinToken.id`
	// check — its twin *is* the Sepolia token — and the receive-side filter cannot reject
	// it either, since ckETH narrows to the `evm` identifier `'eth'` that Base, Arbitrum
	// and Sepolia ETH all share. Only the network id separates them.
	const destinationNetworkId = destinationToken.network.id;

	try {
		const swapDetails =
			isTokenCkEthLedger(ckSourceToken) && destinationNetworkId === ETHEREUM_NETWORK_ID
				? await resolveCkEthWithdrawalDetails(ckSourceToken)
				: isTokenCkErc20Ledger(ckSourceToken) && destinationNetworkId === ETHEREUM_NETWORK_ID
					? await resolveCkErc20WithdrawalDetails(ckSourceToken)
					: isTokenCkBtcLedger(ckSourceToken) && destinationNetworkId === BTC_MAINNET_NETWORK_ID
						? await resolveCkBtcWithdrawalDetails({
								sourceToken: ckSourceToken,
								destinationToken,
								amount
							})
						: undefined;

		if (isNullish(swapDetails)) {
			return;
		}

		return {
			provider: SwapProvider.CHAIN_FUSION,
			receiveAmount: computeChainFusionReceiveAmount({
				amount,
				sourceFees: swapDetails.sourceFees
			}),
			swapDetails
		};
	} catch (err: unknown) {
		consoleError(err);
	}
};

/**
 * Maps the IC send progress onto the swap progress the wizard renders.
 *
 * The approval legs fold into `INITIALIZATION` deliberately: `ProgressStepsSwap` has a
 * single `APPROVE` pair, while a ck withdrawal emits one approval for ckETH and two for
 * ckERC20 — surfacing them would leave a step permanently unreached in one of the two
 * directions. They are canister calls with the session identity, so nothing is waiting
 * on the user during them.
 */
const toSwapProgressStep = (step: ProgressStepsSendIc): ProgressStepsSwap =>
	({
		[ProgressStepsSendIc.INITIALIZATION]: ProgressStepsSwap.INITIALIZATION,
		[ProgressStepsSendIc.APPROVE_FEES]: ProgressStepsSwap.INITIALIZATION,
		[ProgressStepsSendIc.APPROVE_TRANSFER]: ProgressStepsSwap.INITIALIZATION,
		[ProgressStepsSendIc.SEND]: ProgressStepsSwap.SWAP,
		[ProgressStepsSendIc.RELOAD]: ProgressStepsSwap.UPDATE_UI,
		[ProgressStepsSendIc.DONE]: ProgressStepsSwap.DONE
	})[step];

/**
 * Persists the active user transaction that keeps a ck conversion settling after the
 * modal closes. Called at the point of no return — the funds have already left the
 * user's wallet — which is why every failure here is swallowed: an untracked
 * conversion still completes, and surfacing a bookkeeping error as a swap failure
 * would be a lie about the money. Same contract as `createAutAndDetachCloser`.
 *
 * Two prerequisites are checked rather than assumed, because a row that cannot be
 * polled is worse than no row: it never terminalizes and occupies one of the user's
 * slots for good. Both are unreachable for the pairs Chain Fusion offers — but
 * `toBackendTokenId` is shared, and `minterCanisterId` is optional on `IcCkToken`.
 * Either way the conversion degrades to untracked, which is the Convert flow's
 * behaviour today, rather than to aborted.
 */
const createChainFusionActiveUserTransaction = async ({
	identity,
	swapId,
	direction,
	sourceToken,
	destinationToken,
	minterCanisterId,
	amount,
	swapAmount,
	usdSourceValue,
	extraRefs
}: {
	identity: Identity;
	swapId: string;
	direction: ChainFusionDirection;
	sourceToken: Token;
	destinationToken: Token;
	minterCanisterId: CanisterIdText | undefined;
	amount: bigint;
	swapAmount: Amount;
	usdSourceValue?: string;
	extraRefs: Partial<Record<ChainFusionExternalRefKey, string>>;
}): Promise<void> => {
	try {
		const data = toChainFusionData({ direction, sourceToken, destinationToken, amount });

		if (isNullish(data) || isNullish(minterCanisterId)) {
			consoleError('Skipping an untrackable Chain Fusion conversion', { swapId });
			return;
		}

		await createActiveUserTransaction({
			identity,
			id: swapId,
			data,
			externalRefs: toChainFusionExternalRefs({
				...toChainFusionDisplayRefs({
					sourceToken,
					destinationToken,
					amount: `${swapAmount}`,
					usdSourceValue
				}),
				[CHAIN_FUSION_EXTERNAL_REF_KEYS.MINTER_CANISTER_ID]: minterCanisterId,
				...extraRefs
			})
		});
	} catch (err: unknown) {
		consoleError(err);
	}
};

/**
 * Enabling the destination runs only after the funds have moved, so a swap the user
 * cancels on Review never leaves an enabled token behind. Failure is swallowed: the
 * conversion already succeeded and visibility is not worth surfacing as a swap error.
 *
 * Injected rather than imported: `enableSwapDestinationToken` lives in `swap.services`,
 * which reaches this module through the provider registries — importing it back would
 * close a cycle. `executeNearIntentsSwap` takes the same callback for the same reason.
 */
const enableDestination = async (
	enableDestinationToken: (() => Promise<void>) | undefined
): Promise<void> => {
	try {
		await enableDestinationToken?.();
	} catch (err: unknown) {
		consoleError(err);
	}
};

const toChainFusionWithdrawalDirection = (
	type: IcCkWithdrawalResult['type']
): ChainFusionDirection =>
	type === 'ckBtcToBtc'
		? { CkBtcToBtc: null }
		: type === 'ckEthToEth'
			? { CkEthToEth: null }
			: { CkErc20ToErc20: null };

/**
 * Executes a ck withdrawal — ckETH → ETH, ckERC20 → ERC20 or ckBTC → BTC — by delegating
 * to the existing `sendIc`, which already owns the approve/withdraw choreography the
 * Convert flow uses, and picks its minter leg from the target network. Nothing in `$icp`
 * changes for this.
 *
 * Returns the minter block index `sendIc` surfaces — the same index the active user
 * transaction created here is keyed on, so nothing is re-derived.
 */
export const fetchChainFusionIcpSwap = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	swapAmount,
	destinationAddress,
	swapId,
	usdSourceValue,
	enableDestinationToken
}: {
	identity: Identity;
	progress: (step: ProgressStepsSwap) => void;
	sourceToken: IcCkToken;
	destinationToken: Token;
	swapAmount: Amount;
	// The user's own address on the destination chain — Ethereum or Bitcoin, depending on
	// which minter leg `sendIc` takes.
	destinationAddress: Address;
	swapId: string;
	usdSourceValue?: string;
	enableDestinationToken?: () => Promise<void>;
}): Promise<IcCkWithdrawalResult | undefined> => {
	// The ckETH allowance a ckERC20 withdrawal grants the minter, resolved here — at the
	// point of use — rather than taken from the quote. The minter checks the allowance
	// against its *current* fee estimate, which moves with every transaction it processes,
	// while the quote freezes the moment the user reaches Review — `SwapTokenWizard`
	// pauses amount updates there, and never runs them periodically for an ICP-network
	// source at all. A quote-time figure is therefore stale by however long the user
	// deliberates, and any upward move in between had the minter reject the withdrawal
	// with `InsufficientAllowance`. The Convert flow dodges the same race by polling the
	// price every 30 seconds through its whole wizard and reading the store at execution
	// (`IcConvertTokenWizard`); one fresh query at the point of use is the same guarantee
	// without the timer.
	//
	// Resolved through the same `resolveCkErc20WithdrawalDetails` the quote uses — which
	// builds exactly one external fee, the minter's estimate plus the ckETH ledger fee —
	// so the approved figure can only differ from the quoted one in freshness, never in
	// shape. `undefined` on a missing prerequisite; `sendIc` then fails its own assertion
	// before any approval is made.
	const ckErc20ToErc20MaxCkEthFees = isTokenCkErc20Ledger(sourceToken)
		? (await resolveCkErc20WithdrawalDetails(sourceToken))?.externalFees[0]?.fee
		: undefined;

	const amount = parseToken({ value: `${swapAmount}`, unitName: sourceToken.decimals });

	const result = await sendIc({
		identity,
		token: sourceToken,
		amount,
		to: destinationAddress,
		targetNetworkId: destinationToken.network.id,
		ckErc20ToErc20MaxCkEthFees,
		progress: (step: ProgressStepsSendIc) => progress(toSwapProgressStep(step)),
		// `sendIc` reports completion through `progress` for this flow; the swap wizard has
		// no separate completion hook to fire.
		sendCompleted: () => undefined,
		// The withdrawal is irreversible the moment the burn is registered, so the row is
		// created right there — ahead of `sendIc`'s wallet-refresh wait, which a refresh or
		// tab close must not turn into an untracked conversion. The direction comes from
		// the result rather than from a second look at the token pair: `sendIc` already
		// decided which minter leg it ran, and each leg surfaces the block index its own
		// minter keys the withdrawal status on.
		onSent: ({ result: sent }) =>
			nonNullish(sent)
				? createChainFusionActiveUserTransaction({
						identity,
						swapId,
						direction: toChainFusionWithdrawalDirection(sent.type),
						sourceToken,
						destinationToken,
						// The ck source is the token being burned, so its minter is the one to ask.
						minterCanisterId: sourceToken.minterCanisterId,
						amount,
						swapAmount,
						usdSourceValue,
						extraRefs:
							sent.type === 'ckBtcToBtc'
								? {
										[CHAIN_FUSION_EXTERNAL_REF_KEYS.RETRIEVE_BTC_BLOCK_INDEX]: `${sent.blockIndex}`
									}
								: {
										// `retrieve_eth_status` is keyed on the ckETH burn index in both directions — a
										// ckERC20 withdrawal's `withdrawal_id` *is* its `cketh_block_index`. The ckERC20
										// index rides along as the only pointer back to that burn.
										[CHAIN_FUSION_EXTERNAL_REF_KEYS.CKETH_BLOCK_INDEX]: `${
											sent.type === 'ckEthToEth' ? sent.blockIndex : sent.ckEthBlockIndex
										}`,
										...(sent.type === 'ckErc20ToErc20' && {
											[CHAIN_FUSION_EXTERNAL_REF_KEYS.CKERC20_BLOCK_INDEX]: `${sent.ckErc20BlockIndex}`
										})
									}
					})
				: undefined
	});

	await enableDestination(enableDestinationToken);

	return result;
};

/**
 * Translates the Ethereum send progress onto the swap stepper.
 *
 * The two enums share several string values, which made a straight pass-through look
 * correct — but the swap stepper displays `SWAP` and `UPDATE_UI`, and the send layer
 * emits neither: it reports `TRANSFER` and then `DONE`. Passing its steps through
 * verbatim leaves the stepper parked on *Initializing* until everything completes at
 * once. Every other swap service emits `ProgressStepsSwap` explicitly; so does this one.
 *
 * `DONE` maps to `UPDATE_UI` rather than `DONE` because the wizard fires its own `DONE`
 * once the send resolves.
 */
const SEND_TO_SWAP_PROGRESS: Record<ProgressStepsSend, ProgressStepsSwap> = {
	[ProgressStepsSend.INITIALIZATION]: ProgressStepsSwap.INITIALIZATION,
	[ProgressStepsSend.SIGN_APPROVE]: ProgressStepsSwap.SIGN_APPROVE,
	[ProgressStepsSend.APPROVE]: ProgressStepsSwap.APPROVE,
	[ProgressStepsSend.APPROVE_WALLET_CONNECT]: ProgressStepsSwap.APPROVE,
	[ProgressStepsSend.SIGN_TRANSFER]: ProgressStepsSwap.SIGN_TRANSFER,
	[ProgressStepsSend.TRANSFER]: ProgressStepsSwap.SWAP,
	[ProgressStepsSend.DONE]: ProgressStepsSwap.UPDATE_UI
};

/**
 * Executes a ck mint — ETH → ckETH or ERC20 → ckERC20 — as a plain Ethereum send to the
 * minter's helper contract, with `targetNetwork: ICP_NETWORK` so the send services take
 * their existing ck deposit path. This is the same call the Convert flow makes.
 */
export const fetchChainFusionEvmSwap = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	swapAmount,
	userAddress,
	helperContractAddress,
	sourceNetwork,
	minterInfo,
	gas,
	maxFeePerGas,
	maxPriorityFeePerGas,
	swapId,
	usdSourceValue,
	enableDestinationToken
}: {
	identity: Identity;
	progress: (step: ProgressStepsSwap) => void;
	sourceToken: Erc20Token;
	destinationToken: IcCkToken;
	swapAmount: Amount;
	userAddress: EthAddress;
	helperContractAddress: EthAddress;
	sourceNetwork: EthereumNetwork;
	minterInfo: OptionCertifiedMinterInfo;
	gas: bigint;
	maxFeePerGas: bigint;
	maxPriorityFeePerGas: bigint;
	swapId: string;
	usdSourceValue?: string;
	enableDestinationToken?: () => Promise<void>;
}): Promise<void> => {
	const amount = parseToken({ value: `${swapAmount}`, unitName: sourceToken.decimals });

	const { hash } = await sendEth({
		identity,
		from: userAddress,
		// The minter's helper contract, for both legs: `sendTransaction` recognises it as the
		// ck deposit destination and encodes the user's principal itself. The Convert wizards
		// branch on `isErc20Icp` at this spot, but that is about ERC20-ICP's *own* destination
		// being an ICP account-identifier hex that must keep no `0x` — a case that cannot arise
		// here, since the destination is always a contract address and ERC20 ICP has no ck twin.
		to: mapAddressStartsWith0x(helperContractAddress),
		token: sourceToken,
		amount,
		sourceNetwork,
		targetNetwork: ICP_NETWORK,
		minterInfo,
		gas,
		maxFeePerGas,
		maxPriorityFeePerGas,
		progress: (step: ProgressStep) => {
			const mapped = SEND_TO_SWAP_PROGRESS[step as ProgressStepsSend];

			if (nonNullish(mapped)) {
				progress(mapped);
			}
		}
	});

	// The deposit is broadcast, so the row is created regardless of what follows. It
	// carries what the poller needs to follow the mint without any store: the deposit's
	// hash, the helper contract the log to look for lives at, and the minter to ask how
	// far it has scanned. The helper contract is snapshotted rather than re-read later,
	// because a minter upgrade moves the address while the log stays at the old one.
	await createChainFusionActiveUserTransaction({
		identity,
		swapId,
		// `isTokenErc20`, not `isTokenErcFungible`: the direction must agree with how
		// `toBackendTokenId` classifies the source, and only its `Erc20` arm carries
		// the contract address the mint poller's ckERC20 log topic is built from.
		direction: isTokenErc20(sourceToken) ? { Erc20ToCkErc20: null } : { EthToCkEth: null },
		sourceToken,
		destinationToken,
		// The ck destination is the token being minted, so its minter is the one to ask.
		minterCanisterId: destinationToken.minterCanisterId,
		amount,
		swapAmount,
		usdSourceValue,
		extraRefs: {
			[CHAIN_FUSION_EXTERNAL_REF_KEYS.DEPOSIT_TX_HASH]: hash,
			[CHAIN_FUSION_EXTERNAL_REF_KEYS.HELPER_CONTRACT_ADDRESS]: helperContractAddress
		}
	});

	await enableDestination(enableDestinationToken);
};

/**
 * Executes a ckBTC mint — BTC → ckBTC — as a plain Bitcoin send to the minter's per-user
 * deposit address. This is the same call the Convert flow makes, on the same
 * already-quoted UTXO selection, so no fee is recomputed at the point of no return.
 *
 * `sendBtc` records the pending transaction and refreshes the wallet itself, and hands
 * over the broadcast transaction id — the row's poll key: the minter is asked whether it
 * has taken *these* coins, and told to mint them once they are confirmed. The row is
 * created from `onBroadcast`, not from `sendBtc`'s resolution: the steps between the two
 * are best-effort bookkeeping whose failure must not leave an irreversible deposit
 * untracked.
 */
export const fetchChainFusionBtcSwap = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	depositAddress,
	swapId,
	usdSourceValue,
	enableDestinationToken,
	...rest
}: {
	identity: Identity;
	progress: (step: ProgressStepsSwap) => void;
	sourceToken: Token;
	destinationToken: IcCkToken;
	amount: Amount;
	source: BtcAddress;
	depositAddress: BtcAddress;
	network: BitcoinNetwork;
	utxosFee: UtxosFee;
	swapId: string;
	usdSourceValue?: string;
	enableDestinationToken?: () => Promise<void>;
}): Promise<void> => {
	// `sendBtc` reports progress through a bare callback rather than a step enum: once
	// before it asks the signer, once after the transaction is recorded as pending.
	let signed = false;

	await sendBtc({
		...rest,
		identity,
		destination: depositAddress,
		onProgress: () => {
			progress(signed ? ProgressStepsSwap.UPDATE_UI : ProgressStepsSwap.SWAP);
			signed = true;
		},
		// The deposit is irreversible the moment it is broadcast, so the row is created
		// right there. It carries what the poller needs without any store: the transaction
		// to look for, the address it was sent to, and the minter to ask to mint it.
		onBroadcast: ({ txid }) =>
			createChainFusionActiveUserTransaction({
				identity,
				swapId,
				direction: { BtcToCkBtc: null },
				sourceToken,
				destinationToken,
				// The ck destination is the token being minted, so its minter is the one to ask.
				minterCanisterId: destinationToken.minterCanisterId,
				amount: convertNumberToSatoshis({ amount: rest.amount }),
				swapAmount: rest.amount,
				usdSourceValue,
				extraRefs: {
					[CHAIN_FUSION_EXTERNAL_REF_KEYS.BTC_TXID]: txid,
					[CHAIN_FUSION_EXTERNAL_REF_KEYS.BTC_DEPOSIT_ADDRESS]: depositAddress
				}
			})
	});

	await enableDestination(enableDestinationToken);
};
