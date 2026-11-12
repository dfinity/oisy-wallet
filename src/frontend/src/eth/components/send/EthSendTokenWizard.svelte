<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, onDestroy, setContext, untrack } from 'svelte';
	import { writable } from 'svelte/store';
	import EthFeeContext from '$eth/components/fee/EthFeeContext.svelte';
	import EthSendForm from '$eth/components/send/EthSendForm.svelte';
	import EthSendReview from '$eth/components/send/EthSendReview.svelte';
	import { sendSteps } from '$eth/constants/steps.constants';
	import { readEthBalance } from '$eth/services/eth-balance.services';
	import { sendNft } from '$eth/services/nft-send.services';
	import { send as executeSend } from '$eth/services/send.services';
	import {
		ETH_FEE_CONTEXT_KEY,
		type EthFeeContext as FeeContextType,
		initEthFeeContext,
		initEthFeeStore
	} from '$eth/stores/eth-fee.store';
	import type { EthereumNetwork } from '$eth/types/network';
	import {
		MobileEthSendPendingError,
		MobileEthSendSessionExpiredError,
		type EthSendTransactionReference,
		type ProgressStep
	} from '$eth/types/send';
	import { isSendOutcomeUnknown, toastEthereumTransactionError } from '$eth/utils/eth-error.utils';
	import { findEthersError, isSupportedEthTokenId } from '$eth/utils/eth.utils';
	import { isMobileEthSendDestination } from '$eth/utils/mobile-send.utils';
	import { capSendAmountToFee, shouldSendWithApproval } from '$eth/utils/send.utils';
	import { isErc20Icp } from '$eth/utils/token.utils';
	import { isSupportedEvmNativeTokenId } from '$evm/utils/native-token.utils';
	import { assertCkEthMinterInfoLoaded } from '$icp-eth/services/cketh.services';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { toCkErc20HelperContractAddress } from '$icp-eth/utils/cketh.utils';
	import { mapAddressStartsWith0x } from '$icp-eth/utils/eth.utils';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import {
		TRACK_NFT_SEND,
		TRACK_COUNT_ETH_SEND_ERROR,
		TRACK_COUNT_ETH_SEND_SUCCESS
	} from '$lib/constants/analytics.constants';
	import { ZERO } from '$lib/constants/app.constants';
	import { MOBILE_SHELL } from '$lib/constants/mobile.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { PLAUSIBLE_EVENT_CONTEXTS } from '$lib/enums/plausible';
	import { ProgressStepsSend } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { idleSignOut } from '$lib/services/auth.services';
	import {
		MobileOperationPendingError,
		MobileOperationSessionExpiredError,
		persistMobileEthSend
	} from '$lib/services/mobile-operation-journal.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { Nft, NonFungibleToken } from '$lib/types/nft';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token, TokenId } from '$lib/types/token';
	import type { WizardStep } from '$lib/types/wizard';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	/**
	 * Send context store
	 */

	const {
		sendTokenDecimals,
		sendTokenId,
		sendToken,
		sendBalance,
		sendEthCustomNonce,
		sendEthFeePriority
	} = getContext<SendContext>(SEND_CONTEXT_KEY);

	/**
	 * Props
	 */

	interface Props {
		currentStep?: WizardStep;
		destination?: string;
		amount: OptionAmount;
		sendProgressStep: string;
		selectedContact?: ContactUi;
		sourceNetwork: EthereumNetwork;
		// Required for the fee and also to retrieve ck minter information.
		// i.e. Ethereum or Sepolia "main" token.
		nativeEthereumToken: Token;
		nft?: Nft;
		onBack: () => void;
		onClose: () => void;
		onNext: () => void;
		onSendBack: () => void;
		onTokensList: () => void;
	}

	let {
		currentStep,
		destination = '',
		amount = $bindable(),
		sendProgressStep = $bindable(),
		selectedContact,
		sourceNetwork,
		nativeEthereumToken,
		nft,
		onBack,
		onClose,
		onNext,
		onSendBack,
		onTokensList
	}: Props = $props();

	let sendWithApproval = $derived(
		!MOBILE_SHELL &&
			shouldSendWithApproval({
				to: destination,
				tokenId: $sendTokenId,
				erc20HelperContractAddress: toCkErc20HelperContractAddress(
					$ckEthMinterInfoStore?.[nativeEthereumToken.id]
				)
			})
	);

	let customNonce = $derived($sendEthCustomNonce);

	// Set by the amount step's "Max" button, and read again at send time: only a "Max" amount stands
	// for "whatever is left" rather than a figure the user typed.
	let amountSetToMax = $state(false);

	let feeIsPaidFromAmount = $derived(
		isSupportedEthTokenId($sendTokenId) || isSupportedEvmNativeTokenId($sendTokenId)
	);

	/**
	 * Fee context store
	 */

	const feeStore = initEthFeeStore();

	const feeSymbolStore = writable<string | undefined>(undefined);
	const feeTokenIdStore = writable<TokenId | undefined>(undefined);
	const feeDecimalsStore = writable<number | undefined>(undefined);

	$effect(() => {
		feeSymbolStore.set(nativeEthereumToken.symbol);
		feeTokenIdStore.set(nativeEthereumToken.id);
		feeDecimalsStore.set(nativeEthereumToken.decimals);
	});

	const feeExchangeRateStore = writable<number | undefined>(undefined);

	$effect(() => {
		feeExchangeRateStore.set($exchanges?.[nativeEthereumToken.id]?.usd);
	});

	let feeContext = $state<EthFeeContext | undefined>();
	const evaluateFee = () => feeContext?.triggerUpdateFee();

	setContext<FeeContextType>(
		ETH_FEE_CONTEXT_KEY,
		initEthFeeContext({
			feeStore,
			feeSymbolStore,
			feeTokenIdStore,
			feeDecimalsStore,
			feeExchangeRateStore,
			evaluateFee
		})
	);

	// The gas an ERC-20 transfer needs depends on what is sent and to whom: a first transfer to an
	// address pays for the storage of its balance. Without this, the fee is re-estimated only on a
	// mined block or a return to the foreground, and the review step freezes whatever sample is in
	// hand, possibly one taken for a previous amount or recipient.
	$effect(() => {
		[amount, destination];

		untrack(() => evaluateFee());
	});

	// Set from an amount or recipient change until the fee estimated for the new values has landed.
	// "Next" waits for it: the review step freezes the fee in hand, and a sample taken for the previous
	// values can fall short of the gas this transfer needs.
	let feeOutdated = $state(false);

	/**
	 * Send
	 */

	const nftSend = async () => {
		if (MOBILE_SHELL || disposed || submitting) {
			return;
		}
		if (isNullishOrEmpty(destination)) {
			toastsError({
				msg: { text: $i18n.send.assertion.destination_address_invalid }
			});
			return;
		}

		if (isNullish($feeStore)) {
			toastsError({
				msg: { text: $i18n.send.assertion.gas_fees_not_defined }
			});
			return;
		}

		// https://github.com/ethers-io/ethers.js/discussions/2439#discussioncomment-1857403
		const { maxFeePerGas, maxPriorityFeePerGas, gas } = $feeStore;

		// https://docs.ethers.org/v5/api/providers/provider/#Provider-getFeeData
		// exceeds block gas limit
		if (isNullish(maxFeePerGas) || isNullish(maxPriorityFeePerGas)) {
			toastsError({
				msg: { text: $i18n.send.assertion.max_gas_fee_per_gas_undefined }
			});
			return;
		}

		// Unexpected errors
		if (isNullish($ethAddress)) {
			toastsError({
				msg: { text: $i18n.send.assertion.address_unknown }
			});
			return;
		}

		if (isNullish(nft)) {
			toastsError({
				msg: { text: $i18n.send.assertion.no_nft_selected }
			});
			return;
		}

		onNext();

		try {
			await sendNft({
				token: $sendToken as NonFungibleToken,
				tokenId: nft.id,
				to: destination,
				from: $ethAddress,
				identity: $authIdentity,
				gas,
				maxFeePerGas,
				maxPriorityFeePerGas,
				progress: (step: ProgressStep) => (sendProgressStep = step)
			});

			sendProgressStep = ProgressStepsSend.DONE;

			trackEvent({
				name: TRACK_NFT_SEND,
				metadata: {
					resultStatus: 'success',
					token: $sendToken.symbol,
					collection: nft.collection.name ?? '',
					address: nft.collection.address,
					tokenId: String(nft.id),
					network: sourceNetwork.name
				}
			});

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			const ethersErr = findEthersError(err);

			trackEvent({
				name: TRACK_NFT_SEND,
				metadata: {
					resultStatus: 'error',
					token: $sendToken.symbol,
					collection: nft.collection.name ?? '',
					address: nft.collection.address,
					tokenId: String(nft.id),
					network: sourceNetwork.name,
					// Only the code: ethers' message holds the signed transaction and the node's answer.
					...(nonNullish(ethersErr) && { error: ethersErr.code })
				}
			});

			toastEthereumTransactionError({
				err,
				fallbackMsg: $i18n.send.error.unexpected,
				token: $sendToken,
				context: PLAUSIBLE_EVENT_CONTEXTS.SEND
			});

			leaveFailedSend(err);
		}
	};

	let submitting = false;
	let disposed = false;
	let closeTimer: ReturnType<typeof setTimeout> | undefined;
	onDestroy(() => {
		disposed = true;
		clearTimeout(closeTimer);
	});

	const send = async () => {
		if (submitting || disposed || currentStep?.name !== WizardStepsSend.REVIEW) {
			return;
		}
		// The balance reread can yield while the review button is still visible.
		submitting = true;
		try {
			await submitSend();
		} catch {
			if (!disposed) {
				toastsError({ msg: { text: $i18n.send.error.unexpected } });
			}
		} finally {
			submitting = false;
		}
	};

	const submitSend = async () => {
		const token = $sendToken;
		const identity = $authIdentity;
		const from = $ethAddress;
		const reviewedDestination = destination;
		const reviewedAmount = amount;
		const reviewedNetwork = sourceNetwork;
		const minterInfo = $ckEthMinterInfoStore?.[nativeEthereumToken.id];
		const canProceed = () =>
			!disposed &&
			(currentStep?.name === WizardStepsSend.REVIEW ||
				currentStep?.name === WizardStepsSend.SENDING) &&
			amount === reviewedAmount &&
			token.id === $sendToken.id &&
			identity === $authIdentity &&
			from === $ethAddress &&
			reviewedDestination === destination &&
			reviewedNetwork.id === sourceNetwork.id &&
			reviewedNetwork.chainId === sourceNetwork.chainId;
		if (MOBILE_SHELL && !isMobileEthSendDestination({ token, destination, minterInfo })) {
			toastsError({ msg: { text: $i18n.send.assertion.destination_address_invalid } });
			return;
		}

		if (isNullishOrEmpty(destination)) {
			toastsError({
				msg: { text: $i18n.send.assertion.destination_address_invalid }
			});
			return;
		}

		if (invalidAmount(amount) || isNullish(amount)) {
			toastsError({
				msg: { text: $i18n.send.assertion.amount_invalid }
			});
			return;
		}

		if (isNullish($feeStore)) {
			toastsError({
				msg: { text: $i18n.send.assertion.gas_fees_not_defined }
			});
			return;
		}

		if (!MOBILE_SHELL) {
			const { valid } = assertCkEthMinterInfoLoaded({ minterInfo });
			if (!valid) {
				return;
			}
		}

		// One snapshot for both the signature and the cap below. Rebuilding a literal from parts of it
		// would let any term the rebuild omits - such as the OP-stack `l1Fee` - drop out of the ceiling
		// the cap enforces, which is the very shortfall the cap exists to prevent.
		// https://github.com/ethers-io/ethers.js/discussions/2439#discussioncomment-1857403
		const feeData = $feeStore;

		const { maxFeePerGas, maxPriorityFeePerGas, gas } = feeData;

		// https://docs.ethers.org/v5/api/providers/provider/#Provider-getFeeData
		// exceeds block gas limit
		if (isNullish(maxFeePerGas) || isNullish(maxPriorityFeePerGas)) {
			toastsError({
				msg: { text: $i18n.send.assertion.max_gas_fee_per_gas_undefined }
			});
			return;
		}

		// Unexpected errors
		if (isNullish(from)) {
			toastsError({
				msg: { text: $i18n.send.assertion.address_unknown }
			});
			return;
		}

		const parsedAmount = parseToken({
			value: `${amount}`,
			unitName: $sendTokenDecimals
		});

		let sendAmount = parsedAmount;

		if (amountSetToMax && feeIsPaidFromAmount) {
			// Taken before the re-read below, whose failure resets the stored balance. It is the last
			// poll sample rather than the one "Max" was priced against: a failed poll while on this
			// step can already have emptied it, which is why a missing balance is refused below
			// instead of being treated as nothing to cap.
			const sampledBalance = $sendBalance;

			// The balance a "Max" amount was priced against is a poll sample, and every transaction the
			// wallet sends in between - an ERC-20 transfer, an approval, a swap - pays its gas out of
			// this very balance. Until the next poll lands, that sample still holds gas the account
			// has already spent, and an amount drawn from it reserves more than there is left to
			// reserve.
			//
			// The value is taken from the read itself, never from the store: the store is written
			// through `batchSet`, which only lands on the next animation frame, so reading it back
			// here would still yield the stale sample this re-read exists to replace.
			const balance =
				(await readEthBalance({ networkId: token.network.id, tokenId: token.id })) ??
				sampledBalance;

			if (!canProceed()) {
				return;
			}

			// Neither the chain nor the store can say what the account holds. `capSendAmountToFee`
			// returns an amount it has no balance for unchanged, so going on would broadcast a "Max"
			// that nothing bounds.
			if (isNullish(balance)) {
				toastsError({
					msg: {
						text: replacePlaceholders($i18n.init.error.loading_balance, {
							$symbol: $sendToken.symbol,
							$network: sourceNetwork.name
						})
					}
				});
				return;
			}

			// The fee is frozen from the review step on, so the sample signed just above is the one the
			// amount step last showed. The "Max" button, however, re-applies its amount half a second
			// after each fee change, so a click on "Review" inside that window carries an amount priced
			// against the sample before. A fee that has risen in between leaves it unable to cover
			// `gas * maxFeePerGas`, and the chain refuses such a transaction outright.
			sendAmount = capSendAmountToFee({ amount: parsedAmount, balance, feeData });
		}

		if (sendAmount <= ZERO) {
			toastsError({
				msg: { text: $i18n.send.assertion.insufficient_funds_for_gas }
			});
			return;
		}

		if (!canProceed()) {
			return;
		}
		onNext();

		const sendTrackingEventMetadata = {
			token: $sendToken.symbol,
			network: sourceNetwork.id.description ?? `${$sendToken.network.id.description}`,
			feePriority: $sendEthFeePriority,
			maxFeePerGas: maxFeePerGas.toString(),
			maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
			gas: gas.toString()
		};

		try {
			await executeSend({
				from,
				to:
					isErc20Icp(token) && !MOBILE_SHELL
						? reviewedDestination
						: mapAddressStartsWith0x(reviewedDestination),
				progress: (step: ProgressStep) => {
					if (!disposed) {
						sendProgressStep = step;
					}
				},
				token,
				amount: sendAmount,
				maxFeePerGas,
				maxPriorityFeePerGas,
				gas,
				customNonce,
				sourceNetwork: reviewedNetwork,
				identity,
				minterInfo,
				canProceed,
				...(MOBILE_SHELL
					? {
							beforeBroadcast: async ({ hash, nonce }: EthSendTransactionReference) => {
								if (isNullish(identity)) {
									throw new MobileEthSendSessionExpiredError();
								}
								await persistMobileEthSend({
									identity,
									token,
									from,
									to: reviewedDestination,
									hash,
									nonce
								});
							}
						}
					: {})
			});

			trackEvent({
				name: TRACK_COUNT_ETH_SEND_SUCCESS,
				metadata: sendTrackingEventMetadata
			});

			if (!disposed) {
				closeTimer = setTimeout(() => close(), 750);
			}
		} catch (err: unknown) {
			if (disposed) {
				return;
			}
			if (
				MOBILE_SHELL &&
				(err instanceof MobileEthSendSessionExpiredError ||
					err instanceof MobileOperationSessionExpiredError)
			) {
				await idleSignOut();
				return;
			}
			if (
				MOBILE_SHELL &&
				(err instanceof MobileEthSendPendingError || err instanceof MobileOperationPendingError)
			) {
				toastsError({ msg: { text: $i18n.send.text.mobile_pending } });
				close();
				return;
			}
			if (MOBILE_SHELL) {
				toastsError({ msg: { text: $i18n.send.error.unexpected } });
				onBack();
				return;
			}

			trackEvent({
				name: TRACK_COUNT_ETH_SEND_ERROR,
				metadata: sendTrackingEventMetadata
			});

			toastEthereumTransactionError({
				err,
				fallbackMsg: $i18n.send.error.unexpected,
				token: $sendToken,
				context: PLAUSIBLE_EVENT_CONTEXTS.SEND
			});

			leaveFailedSend(err);
		}
	};

	const close = () => onClose();
	const back = () => onSendBack();

	// A transaction that may have reached the network is not offered again from the review: sent
	// again, it would be signed with the next nonce, and both could execute.
	const leaveFailedSend = (err: unknown) => {
		if (isSendOutcomeUnknown(err)) {
			close();
			return;
		}

		onBack();
	};
</script>

<EthFeeContext
	bind:this={feeContext}
	{amount}
	{destination}
	{nativeEthereumToken}
	observe={currentStep?.name !== WizardStepsSend.SENDING &&
		currentStep?.name !== WizardStepsSend.REVIEW}
	priority={$sendEthFeePriority}
	sendNft={nft}
	sendToken={$sendToken}
	sendTokenId={$sendTokenId}
	{sourceNetwork}
	bind:outdated={feeOutdated}
>
	{#key currentStep?.name}
		{#if currentStep?.name === WizardStepsSend.REVIEW}
			<EthSendReview
				{amount}
				{destination}
				{nft}
				{onBack}
				onSend={nonNullish(nft) ? nftSend : send}
				{selectedContact}
			/>
		{:else if currentStep?.name === WizardStepsSend.SENDING}
			<InProgressWizard
				progressStep={sendProgressStep}
				steps={sendSteps({ i18n: $i18n, sendWithApproval })}
			/>
		{:else if currentStep?.name === WizardStepsSend.SEND}
			<EthSendForm
				{feeOutdated}
				{nativeEthereumToken}
				{onBack}
				{onNext}
				{onTokensList}
				{selectedContact}
				bind:destination
				bind:amount
				bind:amountSetToMax
			>
				{#snippet cancel()}
					<ButtonBack onclick={back} />
				{/snippet}
			</EthSendForm>
		{/if}
	{/key}
</EthFeeContext>
