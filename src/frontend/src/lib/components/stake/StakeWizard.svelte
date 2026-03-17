<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import HarvestStakeWizard from '$eth/components/stake/harvest-autopilot/HarvestStakeWizard.svelte';
	import { isTokenHarvestAutopilot } from '$eth/utils/harvest-autopilots.utils';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Vault } from '$lib/types/vaults';

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
</script>

{#if nonNullish(vault) && isTokenHarvestAutopilot(vault.token)}
	<HarvestStakeWizard
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
