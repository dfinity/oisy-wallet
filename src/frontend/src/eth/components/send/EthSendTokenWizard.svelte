<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { type Snippet, createEventDispatcher, getContext, setContext } from 'svelte';
	import { run } from 'svelte/legacy';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext, setContext } from 'svelte';
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
		TRACK_COUNT_ETH_NFT_SEND_ERROR,
		TRACK_COUNT_ETH_NFT_SEND_SUCCESS,
		TRACK_COUNT_ETH_SEND_ERROR,
		TRACK_COUNT_ETH_SEND_SUCCESS
	} from '$lib/constants/analytics.contants';
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

	// Required for the fee and also to retrieve ck minter information.

	interface Props {
		currentStep: WizardStep | undefined;
		/**
		 * Props
		 */
		destination?: string;
		sourceNetwork: EthereumNetwork;
		amount?: OptionAmount;
		sendProgressStep: string;
		selectedContact?: ContactUi;
		// i.e. Ethereum or Sepolia "main" token.
		nativeEthereumToken: Token;
		children?: Snippet;
	}

	let {
		currentStep,
		destination = $bindable(''),
		sourceNetwork,
		amount = $bindable(),
		sendProgressStep = $bindable(),
		selectedContact = undefined,
		nativeEthereumToken,
		children
	}: Props = $props();

	let sendWithApproval: boolean = $derived(
		shouldSendWithApproval({
			to: destination,
			tokenId: $sendTokenId,
			erc20HelperContractAddress: toCkErc20HelperContractAddress(
				$ckEthMinterInfoStore?.[nativeEthereumToken.id]
			)
		})
	);

	/**
	 * Fee context store
	 */

	const feeStore = initEthFeeStore();

	const feeSymbolStore = writable<string | undefined>(undefined);
	run(() => {
		feeSymbolStore.set(nativeEthereumToken.symbol);
	});

	const feeTokenIdStore = writable<TokenId | undefined>(undefined);
	run(() => {
		feeTokenIdStore.set(nativeEthereumToken.id);
	});

	const feeDecimalsStore = writable<number | undefined>(undefined);
	run(() => {
		feeDecimalsStore.set(nativeEthereumToken.decimals);
	});

	const feeExchangeRateStore = writable<number | undefined>(undefined);
	run(() => {
		feeExchangeRateStore.set($exchanges?.[nativeEthereumToken.id]?.usd);
	});

	let feeContext: EthFeeContext | undefined = $state();
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

	const dispatch = createEventDispatcher();

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

		dispatch('icNext');

		try {
			await sendNft({
				token: $sendToken as NonFungibleToken,
				tokenId: nft.id,
				toAddress: destination,
				fromAddress: $ethAddress,
				identity: $authIdentity,
				gas,
				maxFeePerGas,
				maxPriorityFeePerGas,
				progress: (step: ProgressStep) => (sendProgressStep = step)
			});

			trackEvent({
				name: TRACK_COUNT_ETH_NFT_SEND_SUCCESS,
				metadata: {
					token: $sendToken.symbol,
					collection: nft.collection.name ?? nft.collection.address,
					tokenId: String(nft.id),
					network: sourceNetwork.id.description ?? `${$sendToken.network.id.description}`
				}
			});

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			trackEvent({
				name: TRACK_COUNT_ETH_NFT_SEND_ERROR,
				metadata: {
					token: $sendToken.symbol,
					collection: nft.collection.name ?? nft.collection.address,
					tokenId: String(nft.id),
					network: sourceNetwork.id.description ?? `${$sendToken.network.id.description}`
				}
			});

			toastsError({
				msg: { text: $i18n.send.error.unexpected },
				err
			});

			dispatch('icBack');
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

		dispatch('icNext');

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
				sourceNetwork,
				identity: $authIdentity,
				minterInfo: $ckEthMinterInfoStore?.[nativeEthereumToken.id]
			});

			trackEvent({
				name: TRACK_COUNT_ETH_SEND_SUCCESS,
				metadata: {
					token: $sendToken.symbol,
					network: sourceNetwork.id.description ?? `${$sendToken.network.id.description}`
				}
			});

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			trackEvent({
				name: TRACK_COUNT_ETH_SEND_ERROR,
				metadata: {
					token: $sendToken.symbol,
					network: sourceNetwork.id.description ?? `${$sendToken.network.id.description}`
				}
			});

			toastsError({
				msg: { text: $i18n.send.error.unexpected },
				err
			});

			dispatch('icBack');
		}
	};

	const close = () => dispatch('icClose');
	const back = () => dispatch('icSendBack');
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
	{#if currentStep?.name === WizardStepsSend.REVIEW}
		<EthSendReview
			{amount}
			{destination}
			{nft}
			{selectedContact}
			on:icBack
			on:icSend={nonNullish(nft) ? nftSend : send}
		/>
	{:else if currentStep?.name === WizardStepsSend.SENDING}
		<InProgressWizard
			progressStep={sendProgressStep}
			steps={sendSteps({ i18n: $i18n, sendWithApproval })}
		/>
	{:else if currentStep?.name === WizardStepsSend.SEND}
		<EthSendForm
			{nativeEthereumToken}
			{selectedContact}
			on:icNext
			on:icClose={close}
			on:icBack
			on:icTokensList
			bind:destination
			bind:amount
		>
			{#snippet cancel()}
				<ButtonBack onclick={back} />
			{/snippet}
		</EthSendForm>
	{/if}
</EthFeeContext>
