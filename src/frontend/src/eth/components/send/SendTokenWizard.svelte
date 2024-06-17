<script lang="ts">
	import { toastsError } from '$lib/stores/toasts.store';
	import { send as executeSend } from '$eth/services/send.services';
	import { isNullish } from '@dfinity/utils';
	import { type WizardStep } from '@dfinity/gix-components';
	import SendForm from './SendForm.svelte';
	import SendReview from './SendReview.svelte';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsSend } from '$lib/enums/progress-steps';
	import { address } from '$lib/derived/address.derived';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import {
		FEE_CONTEXT_KEY,
		type FeeContext as FeeContextType,
		initFeeContext,
		initFeeStore
	} from '$eth/stores/fee.store';
	import { createEventDispatcher, getContext, setContext } from 'svelte';
	import FeeContext from '$eth/components/fee/FeeContext.svelte';
	import { sendSteps } from '$eth/constants/steps.constants';
	import { parseToken } from '$lib/utils/parse.utils';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { authStore } from '$lib/stores/auth.store';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { assertCkEthMinterInfoLoaded } from '$icp-eth/services/cketh.services';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { mapAddressStartsWith0x } from '$icp-eth/utils/eth.utils';
	import type { Network } from '$lib/types/network';
	import type { EthereumNetwork } from '$eth/types/network';
	import { writable } from 'svelte/store';
	import { i18n } from '$lib/stores/i18n.store';
	import { trackEvent } from '$lib/services/analytics.services';
	import {
		TRACK_COUNT_ETH_SEND_ERROR,
		TRACK_COUNT_ETH_SEND_SUCCESS
	} from '$lib/constants/analytics.contants';
	import { shouldSendWithApproval } from '$eth/utils/send.utils';
	import { toCkErc20HelperContractAddress } from '$icp-eth/utils/cketh.utils';
	import type {OptionToken, Token} from '$lib/types/token';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import SendQRCodeScan from '$lib/components/send/SendQRCodeScan.svelte';
	import { decodeQrCode } from '$eth/utils/qr-code.utils';
	import type { QrResponse, QrStatus } from '$lib/types/qr-code';
	import { erc20Tokens } from '$eth/derived/erc20.derived';

	export let currentStep: WizardStep | undefined;
	export let formCancelAction: 'back' | 'close' = 'close';

	/**
	 * Send context store
	 */

	const { sendTokenDecimals, sendTokenId, sendToken, sendPurpose } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	/**
	 * Props
	 */

	export let destination = '';
	export let sourceNetwork: EthereumNetwork;
	export let targetNetwork: Network | undefined = undefined;
	export let amount: number | undefined = undefined;
	export let sendProgressStep: string;
	// Required for the fee and also to retrieve ck minter information.
	// i.e. Ethereum or Sepolia "main" token.
	export let nativeEthereumToken: Token;

	let destinationEditable = true;
	$: destinationEditable = sendPurpose === 'send';

	let sendWithApproval: boolean;
	$: sendWithApproval = shouldSendWithApproval({
		to: destination,
		tokenId: $sendTokenId,
		erc20HelperContractAddress: toCkErc20HelperContractAddress(
			$ckEthMinterInfoStore?.[nativeEthereumToken.id]
		)
	});

	/**
	 * Fee context store
	 */

	let feeStore = initFeeStore();

	let feeSymbolStore = writable<string | undefined>(undefined);
	$: feeSymbolStore.set(nativeEthereumToken.symbol);

	let feeContext: FeeContext | undefined;
	const evaluateFee = () => feeContext?.triggerUpdateFee();

	setContext<FeeContextType>(
		FEE_CONTEXT_KEY,
		initFeeContext({
			feeStore,
			feeSymbolStore,
			evaluateFee
		})
	);

	/**
	 * Send
	 */

	const dispatch = createEventDispatcher();

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
			minterInfo: $ckEthMinterInfoStore?.[nativeEthereumToken.id],
			network: targetNetwork
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
				msg: { text: $i18n.send.assertion.max_gas_gee_per_gas_undefined }
			});
			return;
		}

		// Unexpected errors
		if (isNullish($address)) {
			toastsError({
				msg: { text: $i18n.send.assertion.address_unknown }
			});
			return;
		}

		dispatch('icNext');

		try {
			await executeSend({
				from: $address,
				to: mapAddressStartsWith0x(destination),
				progress: (step: ProgressStepsSend) => (sendProgressStep = step),
				token: $sendToken,
				amount: parseToken({
					value: `${amount}`,
					unitName: $sendTokenDecimals
				}),
				maxFeePerGas,
				maxPriorityFeePerGas,
				gas,
				sourceNetwork,
				targetNetwork,
				identity: $authStore.identity,
				minterInfo: $ckEthMinterInfoStore?.[nativeEthereumToken.id]
			});

			await trackEvent({
				name: TRACK_COUNT_ETH_SEND_SUCCESS,
				metadata: {
					token: $sendToken.symbol
				}
			});

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			await trackEvent({
				name: TRACK_COUNT_ETH_SEND_ERROR,
				metadata: {
					token: $sendToken.symbol
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

	$: onDecodeQrCode = ({
		status,
		code,
		expectedToken
	}: {
		status: QrStatus;
		code?: string;
		expectedToken: OptionToken;
	}): QrResponse =>
		decodeQrCode({
			status,
			code,
			expectedToken,
			ethereumTokens: $enabledEthereumTokens,
			erc20Tokens: $erc20Tokens
		});
</script>

<FeeContext
	bind:this={feeContext}
	{amount}
	{destination}
	observe={currentStep?.name !== WizardStepsSend.SENDING}
	{sourceNetwork}
	{targetNetwork}
	{nativeEthereumToken}
>
	{#if currentStep?.name === WizardStepsSend.REVIEW}
		<SendReview
			on:icBack
			on:icSend={send}
			{destination}
			{amount}
			{sourceNetwork}
			{targetNetwork}
			{destinationEditable}
		/>
	{:else if currentStep?.name === WizardStepsSend.SENDING}
		<InProgressWizard
			progressStep={sendProgressStep}
			steps={sendSteps({ i18n: $i18n, sendWithApproval })}
		/>
	{:else if currentStep?.name === WizardStepsSend.SEND}
		<SendForm
			on:icNext
			on:icClose={close}
			on:icQRCodeScan
			bind:destination
			bind:amount
			bind:network={targetNetwork}
			{nativeEthereumToken}
			{destinationEditable}
			{sourceNetwork}
		>
			<svelte:fragment slot="cancel">
				{#if formCancelAction === 'back'}
					<button type="button" class="secondary block flex-1" on:click={back}
						>{$i18n.core.text.back}</button
					>
				{:else}
					<button type="button" class="secondary block flex-1" on:click={close}
						>{$i18n.core.text.cancel}</button
					>
				{/if}
			</svelte:fragment>
		</SendForm>
	{:else if currentStep?.name === WizardStepsSend.QR_CODE_SCAN}
		<SendQRCodeScan
			expectedToken={$sendToken}
			bind:destination
			bind:amount
			decodeQrCode={onDecodeQrCode}
			on:icQRCodeBack
		/>
	{:else}
		<slot />
	{/if}
</FeeContext>
