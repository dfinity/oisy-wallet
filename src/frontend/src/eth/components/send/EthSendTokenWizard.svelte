<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import EthFeeContext from '$eth/components/fee/EthFeeContext.svelte';
	import EthSendForm from '$eth/components/send/EthSendForm.svelte';
	import EthSendReview from '$eth/components/send/EthSendReview.svelte';
	import { sendSteps } from '$eth/constants/steps.constants';
	import { send as executeSend } from '$eth/services/send.services';
	import {
		ETH_FEE_CONTEXT_KEY,
		type EthFeeContext as FeeContextType,
		initEthFeeContext,
		initEthFeeStore
	} from '$eth/stores/eth-fee.store';
	import type { EthereumNetwork } from '$eth/types/network';
	import type { ProgressStep } from '$eth/types/send';
	import { shouldSendWithApproval } from '$eth/utils/send.utils';
	import { isErc20Icp } from '$eth/utils/token.utils';
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
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { sendNft } from '$lib/services/nft.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { Nft, NonFungibleToken } from '$lib/types/nft';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token, TokenId } from '$lib/types/token';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	/**
	 * Send context store
	 */

	const { sendTokenDecimals, sendTokenId, sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

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
		shouldSendWithApproval({
			to: destination,
			tokenId: $sendTokenId,
			erc20HelperContractAddress: toCkErc20HelperContractAddress(
				$ckEthMinterInfoStore?.[nativeEthereumToken.id]
			)
		})
	);

	let customNonce = $state<number | undefined>();

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

	/**
	 * Send
	 */

	const nftSend = async () => {
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
			trackEvent({
				name: TRACK_NFT_SEND,
				metadata: {
					resultStatus: 'error',
					token: $sendToken.symbol,
					collection: nft.collection.name ?? '',
					address: nft.collection.address,
					tokenId: String(nft.id),
					network: sourceNetwork.name,
					error: (err as Error).message
				}
			});

			toastsError({
				msg: { text: $i18n.send.error.unexpected },
				err
			});

			onBack();
		}
	};

	const send = async () => {
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

		const { valid } = assertCkEthMinterInfoLoaded({
			minterInfo: $ckEthMinterInfoStore?.[nativeEthereumToken.id]
		});

		if (!valid) {
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

		onNext();

		const sendTrackingEventMetadata = {
			token: $sendToken.symbol,
			network: sourceNetwork.id.description ?? `${$sendToken.network.id.description}`,
			maxFeePerGas: maxFeePerGas.toString(),
			maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
			gas: gas.toString()
		};

		try {
			await executeSend({
				from: $ethAddress,
				to: isErc20Icp($sendToken) ? destination : mapAddressStartsWith0x(destination),
				progress: (step: ProgressStep) => (sendProgressStep = step),
				token: $sendToken,
				amount: parseToken({
					value: `${amount}`,
					unitName: $sendTokenDecimals
				}),
				maxFeePerGas,
				maxPriorityFeePerGas,
				gas,
				customNonce,
				sourceNetwork,
				identity: $authIdentity,
				minterInfo: $ckEthMinterInfoStore?.[nativeEthereumToken.id]
			});

			trackEvent({
				name: TRACK_COUNT_ETH_SEND_SUCCESS,
				metadata: sendTrackingEventMetadata
			});

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			trackEvent({
				name: TRACK_COUNT_ETH_SEND_ERROR,
				metadata: sendTrackingEventMetadata
			});

			toastsError({
				msg: { text: $i18n.send.error.unexpected },
				err
			});

			onBack();
		}
	};

	const close = () => onClose();
	const back = () => onSendBack();
</script>

<EthFeeContext
	bind:this={feeContext}
	{amount}
	{destination}
	{nativeEthereumToken}
	observe={currentStep?.name !== WizardStepsSend.SENDING}
	sendNft={nft}
	sendToken={$sendToken}
	sendTokenId={$sendTokenId}
	{sourceNetwork}
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
				{nativeEthereumToken}
				{onBack}
				{onNext}
				{onTokensList}
				{selectedContact}
				bind:destination
				bind:customNonce
				bind:amount
			>
				{#snippet cancel()}
					<ButtonBack onclick={back} />
				{/snippet}
			</EthSendForm>
		{/if}
	{/key}
</EthFeeContext>
