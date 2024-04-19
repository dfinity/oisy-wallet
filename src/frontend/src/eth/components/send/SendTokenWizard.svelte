<script lang="ts">
	import { toastsError } from '$lib/stores/toasts.store';
	import { send as executeSend } from '$eth/services/send.services';
	import { isNullish } from '@dfinity/utils';
	import { type WizardStep } from '@dfinity/gix-components';
	import SendForm from './SendForm.svelte';
	import SendReview from './SendReview.svelte';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { SendStep } from '$lib/enums/steps';
	import { address } from '$lib/derived/address.derived';
	import {
		FEE_CONTEXT_KEY,
		type FeeContext as FeeContextType,
		initFeeStore
	} from '$eth/stores/fee.store';
	import { createEventDispatcher, getContext, setContext } from 'svelte';
	import FeeContext from '$eth/components/fee/FeeContext.svelte';
	import { sendSteps } from '$eth/constants/steps.constants';
	import { parseToken } from '$lib/utils/parse.utils';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { authStore } from '$lib/stores/auth.store';
	import { ckEthHelperContractAddressStore } from '$icp-eth/stores/cketh.store';
	import { assertCkEthHelperContractAddressLoaded } from '$icp-eth/services/cketh.services';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { mapAddressStartsWith0x } from '$icp-eth/utils/eth.utils';
	import type { Network } from '$lib/types/network';
	import type { EthereumNetwork } from '$eth/types/network';
	import { writable } from 'svelte/store';
	import { ethereumToken, ethereumTokenId } from '$eth/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { trackEvent } from '$lib/services/analytics.services';
	import {
		TRACK_COUNT_ETH_SEND_ERROR,
		TRACK_COUNT_ETH_SEND_SUCCESS
	} from '$lib/constants/analytics.contants';
	import { ckEthMinterInfoStore } from '$icp/stores/cketh.store';

	export let currentStep: WizardStep | undefined;
	export let formCancelAction: 'back' | 'close' = 'close';

	/**
	 * Fee context store
	 */

	let feeStore = initFeeStore();

	let feeSymbolStore = writable<string | undefined>(undefined);
	$: feeSymbolStore.set($ethereumToken.symbol);

	setContext<FeeContextType>(FEE_CONTEXT_KEY, {
		feeStore,
		feeSymbolStore
	});

	/**
	 * Send context store
	 */

	const { sendTokenDecimals, sendTokenId, sendToken, sendTokenStandard, sendPurpose } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	/**
	 * Props
	 */

	export let destination = '';
	export let sourceNetwork: EthereumNetwork;
	export let targetNetwork: Network | undefined = undefined;
	export let amount: number | undefined = undefined;
	export let sendProgressStep: string;

	let destinationEditable = true;
	$: destinationEditable = sendPurpose !== 'convert-eth-to-cketh';

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

		const { valid } = assertCkEthHelperContractAddressLoaded({
			tokenStandard: $sendTokenStandard,
			helperContractAddress: $ckEthHelperContractAddressStore?.[$sendTokenId],
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
				progress: (step: SendStep) => (sendProgressStep = step),
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
				minterInfo: $ckEthMinterInfoStore?.[$ethereumTokenId]
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
</script>

<FeeContext
	{amount}
	{destination}
	observe={currentStep?.name !== 'Sending'}
	{sourceNetwork}
	{targetNetwork}
>
	{#if currentStep?.name === 'Review'}
		<SendReview
			on:icBack
			on:icSend={send}
			{destination}
			{amount}
			{sourceNetwork}
			{targetNetwork}
			{destinationEditable}
		/>
	{:else if currentStep?.name === 'Sending'}
		<InProgressWizard progressStep={sendProgressStep} steps={sendSteps($i18n)} />
	{:else if currentStep?.name === 'Send'}
		<SendForm
			on:icNext
			on:icClose={close}
			bind:destination
			bind:amount
			bind:network={targetNetwork}
			{destinationEditable}
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
	{:else}
		<slot />
	{/if}
</FeeContext>
