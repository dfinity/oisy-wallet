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
		receiveAmount?: number;
		customDestination?: string;
		convertProgressStep: string;
		currentStep?: WizardStep;
		formCancelAction?: 'back' | 'close';
		onBack: () => void;
		onClose: () => void;
		onNext: () => void;
		onDestination: () => void;
		onDestinationBack: () => void;
		onIcQrCodeBack: () => void;
		onIcQrCodeScan: () => void;
	}

	let {
		sendAmount = $bindable(),
		receiveAmount = $bindable(),
		customDestination = $bindable(''),
		convertProgressStep = $bindable(),
		currentStep,
		formCancelAction = 'back',
		onBack,
		onClose,
		onNext,
		onDestination,
		onDestinationBack,
		onIcQrCodeBack,
		onIcQrCodeScan
	}: Props = $props();

	const { sourceToken } = getContext<ConvertContext>(CONVERT_CONTEXT_KEY);
</script>

{#if isNetworkIdBitcoin($sourceToken?.network.id)}
	<BtcConvertTokenWizard
		{currentStep}
		{formCancelAction}
		{onBack}
		{onClose}
		{onNext}
		bind:sendAmount
		bind:receiveAmount
		bind:convertProgressStep
	/>
{:else if isNetworkIdEthereum($sourceToken?.network.id)}
	<EthConvertTokenWizard
		{currentStep}
		{formCancelAction}
		{onBack}
		{onClose}
		{onNext}
		bind:sendAmount
		bind:receiveAmount
		bind:convertProgressStep
	/>
{:else if isNetworkIdICP($sourceToken?.network.id)}
	<IcConvertTokenWizard
		{currentStep}
		{formCancelAction}
		{onBack}
		{onClose}
		{onDestination}
		{onDestinationBack}
		{onIcQrCodeBack}
		{onIcQrCodeScan}
		{onNext}
		bind:sendAmount
		bind:receiveAmount
		bind:convertProgressStep
		bind:customDestination
	/>
{:else}
	<div class="mt-6"><MessageBox>{$i18n.convert.text.unsupported_token_conversion}</MessageBox></div>
{/if}
