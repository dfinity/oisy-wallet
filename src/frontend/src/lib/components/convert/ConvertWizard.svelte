<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { getContext } from 'svelte';
	import BtcConvertTokenWizard from '$btc/components/convert/BtcConvertTokenWizard.svelte';
	import EthConvertTokenWizard from '$eth/components/convert/EthConvertTokenWizard.svelte';
	import IcConvertTokenWizard from '$icp/components/convert/IcConvertTokenWizard.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import {
		isNetworkIdBitcoin,
		isNetworkIdEthereum,
		isNetworkIdICP
	} from '$lib/utils/network.utils';

	interface Props {
		sendAmount: OptionAmount;
		receiveAmount: number | undefined;
		customDestination?: string;
		convertProgressStep: string;
		currentStep: WizardStep | undefined;
		formCancelAction?: 'back' | 'close';
		onIcQrCodeBack: () => void;
	}

	let {
		sendAmount = $bindable(),
		receiveAmount = $bindable(),
		customDestination = $bindable(''),
		convertProgressStep = $bindable(),
		currentStep,
		formCancelAction = 'back',
		onIcQrCodeBack
	}: Props = $props();

	const { sourceToken } = getContext<ConvertContext>(CONVERT_CONTEXT_KEY);
</script>

{#if isNetworkIdBitcoin($sourceToken?.network.id)}
	<BtcConvertTokenWizard
		{currentStep}
		{formCancelAction}
		bind:sendAmount
		bind:receiveAmount
		bind:convertProgressStep
		on:icBack
		on:icNext
		on:icClose
	/>
{:else if isNetworkIdEthereum($sourceToken?.network.id)}
	<EthConvertTokenWizard
		{currentStep}
		{formCancelAction}
		bind:sendAmount
		bind:receiveAmount
		bind:convertProgressStep
		on:icBack
		on:icNext
		on:icClose
	/>
{:else if isNetworkIdICP($sourceToken?.network.id)}
	<IcConvertTokenWizard
		{currentStep}
		{formCancelAction}
		{onIcQrCodeBack}
		bind:sendAmount
		bind:receiveAmount
		bind:convertProgressStep
		bind:customDestination
		on:icBack
		on:icNext
		on:icClose
		on:icDestination
		on:icDestinationBack
		on:icQRCodeScan
	/>
{:else}
	<div class="mt-6"><MessageBox>{$i18n.convert.text.unsupported_token_conversion}</MessageBox></div>
{/if}
