<script lang="ts">
	import { type WizardStep } from '@dfinity/gix-components';
	import { assertNonNullish, isNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import FeeContext from '$eth/components/fee/FeeContext.svelte';
	import SendForm from '$eth/components/send/SendForm.svelte';
	import SendReview from '$eth/components/send/SendReview.svelte';
	import { sendSteps } from '$eth/constants/steps.constants';
	import { erc20Tokens } from '$eth/derived/erc20.derived';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { send as executeSend } from '$eth/services/send.services';
	import {
		FEE_CONTEXT_KEY,
		type FeeContext as FeeContextType,
		initFeeContext,
		initFeeStore
	} from '$eth/stores/fee.store';
	import type { EthereumNetwork } from '$eth/types/network';
	import { decodeQrCode } from '$eth/utils/qr-code.utils';
	import { shouldSendWithApproval } from '$eth/utils/send.utils';
	import { isErc20Icp } from '$eth/utils/token.utils';
	import { assertCkEthMinterInfoLoaded } from '$icp-eth/services/cketh.services';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { toCkErc20HelperContractAddress } from '$icp-eth/utils/cketh.utils';
	import { mapAddressStartsWith0x } from '$icp-eth/utils/eth.utils';
	import SendQRCodeScan from '$lib/components/send/SendQRCodeScan.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsSend } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { Network } from '$lib/types/network';
	import type { QrResponse, QrStatus } from '$lib/types/qr-code';
	import type { OptionToken, TokenId } from '$lib/types/token';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	export let currentStep: WizardStep | undefined;

	/**
	 * Send context store
	 */

	const { sendToken, sendPurpose, sendBalance, ethereumNativeToken } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	assertNonNullish($ethereumNativeToken, 'inconsistency in Ethereum native token');

	/**
	 * Props
	 */

	export let destination = '';
	export let targetNetwork: Network | undefined = undefined;
	export let amount: number | undefined = undefined;
	export let sendProgressStep: string;

	let sourceNetwork: EthereumNetwork;
	$: sourceNetwork = $sendToken.network as EthereumNetwork;

	let destinationEditable = true;
	$: destinationEditable = sendPurpose === 'send';

	let sendWithApproval: boolean;
	$: sendWithApproval = shouldSendWithApproval({
		to: destination,
		tokenId: $sendToken.id,
		erc20HelperContractAddress: toCkErc20HelperContractAddress(
			$ckEthMinterInfoStore?.[$ethereumNativeToken.id]
		)
	});

	/**
	 * Fee context store
	 */

	let feeStore = initFeeStore();

	let feeSymbolStore = writable<string | undefined>(undefined);
	$: feeSymbolStore.set($ethereumNativeToken.symbol);

	let feeTokenIdStore = writable<TokenId | undefined>(undefined);
	$: feeTokenIdStore.set($ethereumNativeToken.id);

	let feeDecimalsStore = writable<number | undefined>(undefined);
	$: feeDecimalsStore.set($ethereumNativeToken.decimals);

	let feeContext: FeeContext | undefined;
	const evaluateFee = () => feeContext?.triggerUpdateFee();

	setContext<FeeContextType>(
		FEE_CONTEXT_KEY,
		initFeeContext({
			feeStore,
			feeSymbolStore,
			feeTokenIdStore,
			feeDecimalsStore,
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
			minterInfo: $ckEthMinterInfoStore?.[$ethereumNativeToken.id],
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
				progress: (step: ProgressStepsSend) => (sendProgressStep = step),
				token: $sendToken,
				amount: parseToken({
					value: `${amount}`,
					unitName: $sendToken.decimals
				}),
				maxFeePerGas,
				maxPriorityFeePerGas,
				gas,
				sourceNetwork,
				targetNetwork,
				identity: $authIdentity,
				minterInfo: $ckEthMinterInfoStore?.[$ethereumNativeToken.id]
			});

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
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
	token={$sendToken}
	bind:this={feeContext}
	{amount}
	{destination}
	observe={currentStep?.name !== WizardStepsSend.SENDING}
	{sourceNetwork}
	{targetNetwork}
	nativeEthereumToken={$ethereumNativeToken}
>
	{#if currentStep?.name === WizardStepsSend.REVIEW}
		<SendReview
			token={$sendToken}
			balance={$sendBalance}
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
			token={$sendToken}
			balance={$sendBalance}
			on:icNext
			on:icClose={close}
			on:icQRCodeScan
			bind:destination
			bind:amount
			bind:network={targetNetwork}
			nativeEthereumToken={$ethereumNativeToken}
			{destinationEditable}
			{sourceNetwork}
		>
			<svelte:fragment slot="cancel">
				<ButtonBack on:click={back} />
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
