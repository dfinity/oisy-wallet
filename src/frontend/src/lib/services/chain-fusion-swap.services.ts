import { CHAIN_FUSION_SWAP_ENABLED } from '$env/chain-fusion-swap.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { send as sendEth } from '$eth/services/send.services';
import type { EthAddress } from '$eth/types/address';
import type { Erc20Token } from '$eth/types/erc20';
import type { EthereumNetwork } from '$eth/types/network';
import type { ProgressStep } from '$eth/types/send';
import { isTokenErcFungible } from '$eth/utils/erc-fungible.utils';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import type { OptionCertifiedMinterInfo } from '$icp-eth/types/cketh-minter';
import {
	toCkErc20HelperContractAddress,
	toCkEthHelperContractAddress
} from '$icp-eth/utils/cketh.utils';
import { mapAddressStartsWith0x } from '$icp-eth/utils/eth.utils';
import { eip1559TransactionPrice } from '$icp/api/cketh-minter.api';
import { icrcTokens } from '$icp/derived/icrc.derived';
import { sendIc } from '$icp/services/ic-send.services';
import type { IcCkWithdrawalResult } from '$icp/types/ic-send';
import type { IcCkToken } from '$icp/types/ic-token';
import { isTokenCkErc20Ledger, isTokenCkEthLedger } from '$icp/utils/ic-send.utils';
import {
	ProgressStepsSend,
	ProgressStepsSendIc,
	ProgressStepsSwap
} from '$lib/enums/progress-steps';
import type { CanisterIdText } from '$lib/types/canister';
import type { Amount } from '$lib/types/send';
import {
	SwapProvider,
	type ChainFusionFee,
	type ChainFusionSwapDetails,
	type EvmQuoteParams,
	type IcpBridgeQuoteParams,
	type SwapMappedResult
} from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { asCkTwinOf, computeChainFusionReceiveAmount } from '$lib/utils/chain-fusion-swap.utils';
import { consoleError } from '$lib/utils/console.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
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
 * Quotes a ck withdrawal — ckETH → ETH or ckERC20 → ERC20.
 *
 * Unlike the mint side this is not free: the minter charges for the Ethereum
 * transaction it sends, so the quote makes a `eip_1559_transaction_price` round-trip
 * per tick. Resolves to `undefined` when the pair is not a ck withdrawal we can settle.
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

	if (destinationToken.network.id !== ETHEREUM_NETWORK_ID) {
		return;
	}

	try {
		const swapDetails = isTokenCkEthLedger(ckSourceToken)
			? await resolveCkEthWithdrawalDetails(ckSourceToken)
			: isTokenCkErc20Ledger(ckSourceToken)
				? await resolveCkErc20WithdrawalDetails(ckSourceToken)
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

/**
 * Executes a ck withdrawal — ckETH → ETH or ckERC20 → ERC20 — by delegating to the
 * existing `sendIc`, which already owns the approve/withdraw choreography the Convert
 * flow uses. Nothing in `$icp` changes for this.
 *
 * Returns the minter block index `sendIc` now surfaces, so PR 5 can key an active user
 * transaction on it without re-deriving anything.
 */
export const fetchChainFusionIcpSwap = async ({
	identity,
	progress,
	sourceToken,
	destinationToken,
	swapAmount,
	destinationAddress,
	enableDestinationToken
}: {
	identity: Identity;
	progress: (step: ProgressStepsSwap) => void;
	sourceToken: IcCkToken;
	destinationToken: Token;
	swapAmount: Amount;
	destinationAddress: EthAddress;
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

	const result = await sendIc({
		identity,
		token: sourceToken,
		amount: parseToken({ value: `${swapAmount}`, unitName: sourceToken.decimals }),
		to: destinationAddress,
		targetNetworkId: destinationToken.network.id,
		ckErc20ToErc20MaxCkEthFees,
		progress: (step: ProgressStepsSendIc) => progress(toSwapProgressStep(step)),
		// `sendIc` reports completion through `progress` for this flow; the swap wizard has
		// no separate completion hook to fire.
		sendCompleted: () => undefined
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
	swapAmount,
	userAddress,
	helperContractAddress,
	sourceNetwork,
	minterInfo,
	gas,
	maxFeePerGas,
	maxPriorityFeePerGas,
	enableDestinationToken
}: {
	identity: Identity;
	progress: (step: ProgressStepsSwap) => void;
	sourceToken: Erc20Token;
	swapAmount: Amount;
	userAddress: EthAddress;
	helperContractAddress: EthAddress;
	sourceNetwork: EthereumNetwork;
	minterInfo: OptionCertifiedMinterInfo;
	gas: bigint;
	maxFeePerGas: bigint;
	maxPriorityFeePerGas: bigint;
	enableDestinationToken?: () => Promise<void>;
}): Promise<void> => {
	await sendEth({
		identity,
		from: userAddress,
		// The minter's helper contract, for both legs: `sendTransaction` recognises it as the
		// ck deposit destination and encodes the user's principal itself. The Convert wizards
		// branch on `isErc20Icp` at this spot, but that is about ERC20-ICP's *own* destination
		// being an ICP account-identifier hex that must keep no `0x` — a case that cannot arise
		// here, since the destination is always a contract address and ERC20 ICP has no ck twin.
		to: mapAddressStartsWith0x(helperContractAddress),
		token: sourceToken,
		amount: parseToken({ value: `${swapAmount}`, unitName: sourceToken.decimals }),
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

	await enableDestination(enableDestinationToken);
};
