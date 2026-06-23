<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { getStakeWizardComponent } from '$lib/config/stake.config';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Vault } from '$lib/types/vaults';
	import type { WizardStep } from '$lib/types/wizard';

	interface Props {
		amount: OptionAmount;
		stakeProgressStep: string;
		vault?: Vault;
		currentStep?: WizardStep;
		onClose: () => void;
		onNext: () => void;
		onBack: () => void;
	}

	let {
		amount = $bindable(),
		stakeProgressStep = $bindable(),
		vault,
		currentStep,
		onClose,
		onNext,
		onBack
	}: Props = $props();

	let WizardComponent = $derived(
		nonNullish(vault) ? getStakeWizardComponent(vault.token) : undefined
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
		bind:stakeProgressStep
	/>
{:else}
	<MessageBox styleClass="mt-6">{$i18n.stake.text.unsupported_token_staking}</MessageBox>
{/if}
