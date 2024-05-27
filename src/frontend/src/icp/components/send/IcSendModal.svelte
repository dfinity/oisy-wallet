<script lang="ts">
	import { WizardModal, type WizardStep } from '@dfinity/gix-components';
	import type { WizardSteps } from '@dfinity/gix-components';
	import { ProgressStepsSendIc, ProgressStepsSendStepName } from '$lib/enums/progress-steps';
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
		BITCOIN_FEE_CONTEXT_KEY,
		type BitcoinFeeContext as BitcoinFeeContextType,
		initBitcoinFeeStore
	} from '$icp/stores/bitcoin-fee.store';
	import { setContext } from 'svelte';
	import BitcoinFeeContext from '$icp/components/fee/BitcoinFeeContext.svelte';
	import { closeModal } from '$lib/utils/modal.utils';
	import { isNetworkIdEthereum } from '$lib/utils/network.utils';
	import { isNetworkIdBTC, isNetworkIdETH } from '$icp/utils/ic-send.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { trackEvent } from '$lib/services/analytics.services';
	import {
		TRACK_COUNT_CONVERT_CKBTC_TO_BTC_ERROR,
		TRACK_COUNT_CONVERT_CKBTC_TO_BTC_SUCCESS,
		TRACK_COUNT_CONVERT_CKETH_TO_ETH_ERROR,
		TRACK_COUNT_CONVERT_CKETH_TO_ETH_SUCCESS,
		TRACK_COUNT_IC_SEND_ERROR,
		TRACK_COUNT_IC_SEND_SUCCESS
	} from '$lib/constants/analytics.contants';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { ckEthereumTwinToken } from '$icp-eth/derived/cketh.derived';
	import EthereumFeeContext from '$icp/components/fee/EthereumFeeContext.svelte';
	import {
		ETHEREUM_FEE_CONTEXT_KEY,
		initEthereumFeeStore,
		type EthereumFeeContext as EthereumFeeContextType
	} from '$icp/stores/ethereum-fee.store';

	/**
	 * Props
	 */

	export let networkId: NetworkId | undefined = undefined;
	export let destination = '';
	let amount: number | undefined = undefined;

	/**
	 * Send
	 */

	let sendProgressStep: string = ProgressStepsSendIc.INITIALIZATION;

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

		modal.next();

		try {
			const params: IcTransferParams = {
				to: destination,
				amount: parseToken({
					value: `${amount}`,
					unitName: $tokenDecimals
				}),
				identity: $authStore.identity,
				progress: (step: ProgressStepsSendIc) => (sendProgressStep = step)
			};

			await sendIc({
				...params,
				token: $token as IcToken,
				targetNetworkId: networkId
			});

			await trackEvent({
				name: isNetworkIdBTC(networkId)
					? TRACK_COUNT_CONVERT_CKBTC_TO_BTC_SUCCESS
					: isNetworkIdETH(networkId)
						? TRACK_COUNT_CONVERT_CKETH_TO_ETH_SUCCESS
						: TRACK_COUNT_IC_SEND_SUCCESS,
				metadata: {
					token: $token.symbol
				}
			});

			sendProgressStep = ProgressStepsSendIc.DONE;

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			await trackEvent({
				name: isNetworkIdBTC(networkId)
					? TRACK_COUNT_CONVERT_CKBTC_TO_BTC_ERROR
					: isNetworkIdETH(networkId)
						? TRACK_COUNT_CONVERT_CKETH_TO_ETH_ERROR
						: TRACK_COUNT_IC_SEND_ERROR,
				metadata: {
					token: $token.symbol
				}
			});

			toastsError({
				msg: { text: $i18n.send.error.unexpected },
				err
			});

			modal.back();
		}
	};

	let steps: WizardSteps;
	$: steps = [
		{
			name: ProgressStepsSendStepName.SEND,
			title: isNetworkIdBTC(networkId)
				? $i18n.convert.text.convert_to_btc
				: isNetworkIdEthereum(networkId)
					? replacePlaceholders($i18n.convert.text.convert_to_token, {
							$token: $ckEthereumTwinToken.symbol
						})
					: $i18n.send.text.send
		},
		{
			name: ProgressStepsSendStepName.REVIEW,
			title: $i18n.send.text.review
		},
		{
			name: ProgressStepsSendStepName.SENDING,
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

			sendProgressStep = ProgressStepsSendIc.INITIALIZATION;

			currentStep = undefined;
		});

	/**
	 * Bitcoin fee context store
	 */

	setContext<BitcoinFeeContextType>(BITCOIN_FEE_CONTEXT_KEY, {
		store: initBitcoinFeeStore()
	});

	/**
	 * Ethereum fee context store
	 */

	setContext<EthereumFeeContextType>(ETHEREUM_FEE_CONTEXT_KEY, {
		store: initEthereumFeeStore()
	});
</script>

<WizardModal
	{steps}
	bind:currentStep
	bind:this={modal}
	on:nnsClose={close}
	disablePointerEvents={currentStep?.name === ProgressStepsSendStepName.SENDING}
>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

	<EthereumFeeContext {networkId}>
		<BitcoinFeeContext {amount} {networkId}>
			{#if currentStep?.name === ProgressStepsSendStepName.REVIEW}
				<IcSendReview on:icBack={modal.back} on:icSend={send} {destination} {amount} {networkId} />
			{:else if currentStep?.name === ProgressStepsSendStepName.SENDING}
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
	</EthereumFeeContext>
</WizardModal>
