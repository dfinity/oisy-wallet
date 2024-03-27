<script lang="ts">
	import { WizardModal, type WizardStep } from '@dfinity/gix-components';
	import type { WizardSteps } from '@dfinity/gix-components';
	import { SendIcStep } from '$lib/enums/steps';
	import IcSendForm from './IcSendForm.svelte';
	import IcSendReview from './IcSendReview.svelte';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { toastsError } from '$lib/stores/toasts.store';
	import { isNullish } from '@dfinity/utils';
	import { sendIc } from '$icp/services/ic-send.services';
	import { parseToken } from '$lib/utils/parse.utils';
	import { token, tokenDecimals } from '$lib/derived/token.derived';
	import { authStore } from '$lib/stores/auth.store';
	import type { IcToken } from '$icp/types/ic';
	import type { NetworkId } from '$lib/types/network';
	import IcSendProgress from '$icp/components/send/IcSendProgress.svelte';
	import type { IcTransferParams } from '$icp/types/ic-send';
	import {
		IC_FEE_CONTEXT_KEY,
		type IcFeeContext as IcFeeContextType,
		initBitcoinFeeStore
	} from '$icp/stores/ic-fee.store';
	import { setContext } from 'svelte';
	import BitcoinFeeContext from '$icp/components/fee/IcFeeContext.svelte';
	import { closeModal } from '$lib/utils/modal.utils';
	import { isNetworkIdEthereum } from '$lib/utils/network.utils';
	import { isNetworkIdBTC } from '$icp/utils/ic-send.utils';
	import { i18n } from '$lib/stores/i18n.store';

	/**
	 * Props
	 */

	export let networkId: NetworkId | undefined = undefined;
	export let destination = '';
	let amount: number | undefined = undefined;

	/**
	 * Send
	 */

	let sendProgressStep: string = SendIcStep.INITIALIZATION;

	const send = async () => {
		if (isNullishOrEmpty(destination)) {
			toastsError({
				msg: { text: `Destination address is invalid.` }
			});
			return;
		}

		if (invalidAmount(amount) || isNullish(amount)) {
			toastsError({
				msg: { text: `Amount is invalid.` }
			});
			return;
		}

		modal.next();

		try {
			let params: IcTransferParams = {
				to: destination,
				amount: parseToken({
					value: `${amount}`,
					unitName: $tokenDecimals
				}),
				identity: $authStore.identity,
				progress: (step: SendIcStep) => (sendProgressStep = step)
			};

			await sendIc({
				...params,
				token: $token as IcToken,
				targetNetworkId: networkId
			});

			sendProgressStep = SendIcStep.DONE;

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			toastsError({
				msg: { text: `Something went wrong while sending the transaction.` },
				err
			});

			modal.back();
		}
	};

	let steps: WizardSteps;
	$: steps = [
		{
			name: 'Send',
			title: isNetworkIdBTC(networkId)
				? $i18n.convert.text.convert_to_btc
				: isNetworkIdEthereum(networkId)
					? $i18n.convert.text.convert_to_eth
					: $i18n.send.text.send
		},
		{
			name: 'Review',
			title: $i18n.send.text.review
		},
		{
			name: 'Sending',
			title: $i18n.send.text.sending
		}
	];

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const close = () =>
		closeModal(() => {
			destination = '';
			amount = undefined;
			networkId = undefined;

			sendProgressStep = SendIcStep.INITIALIZATION;

			currentStep = undefined;
		});

	/**
	 * Btc Fee context store
	 */

	let storeFeeData = initBitcoinFeeStore();

	setContext<IcFeeContextType>(IC_FEE_CONTEXT_KEY, {
		store: storeFeeData
	});
</script>

<WizardModal
	{steps}
	bind:currentStep
	bind:this={modal}
	on:nnsClose={close}
	disablePointerEvents={currentStep?.name === 'Sending'}
>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

	<BitcoinFeeContext {amount} {networkId}>
		{#if currentStep?.name === 'Review'}
			<IcSendReview on:icBack={modal.back} on:icSend={send} {destination} {amount} {networkId} />
		{:else if currentStep?.name === 'Sending'}
			<IcSendProgress bind:sendProgressStep {networkId} />
		{:else}
			<IcSendForm
				on:icNext={modal.next}
				on:icClose={close}
				bind:destination
				bind:amount
				bind:networkId
			/>
		{/if}
	</BitcoinFeeContext>
</WizardModal>
