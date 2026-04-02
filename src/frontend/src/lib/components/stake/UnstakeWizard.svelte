<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { getUnstakeWizardComponent } from '$lib/config/stake.config';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Vault } from '$lib/types/vaults';

	interface Props {
		amount: OptionAmount;
		unstakeProgressStep: string;
		vault?: Vault;
		currentStep?: WizardStep;
		onClose: () => void;
		onNext: () => void;
		onBack: () => void;
	}

	let {
		amount = $bindable(),
		unstakeProgressStep = $bindable(),
		vault,
		currentStep,
		onClose,
		onNext,
		onBack
	}: Props = $props();

	let WizardComponent = $derived(
		nonNullish(vault) ? getUnstakeWizardComponent(vault.token) : undefined
	);
</script>

{#if nonNullish(WizardComponent) && nonNullish(vault)}
	<WizardComponent
		{currentStep}
		{onBack}
		{onClose}
		{onNext}
		{vault}
		bind:amount
		bind:unstakeProgressStep
	/>
{:else}
	<MessageBox styleClass="mt-6">{$i18n.stake.text.unsupported_token_staking}</MessageBox>
{/if}
