<script lang="ts">
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsLiquidiumSupply } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';

	interface Props {
		supplyProgressStep: string;
	}

	let { supplyProgressStep }: Props = $props();

	let steps = $state<ProgressSteps>([
		{
			step: ProgressStepsLiquidiumSupply.INITIALIZATION,
			text: $i18n.send.text.initializing,
			state: 'in_progress'
		},
		{
			step: ProgressStepsLiquidiumSupply.TRANSFER,
			text: $i18n.liquidium.text.starting_to_supply,
			state: 'next'
		},
		{
			step: ProgressStepsLiquidiumSupply.REGISTER,
			text: $i18n.liquidium.text.supply_started,
			state: 'next'
		}
	]);
</script>

<InProgressWizard progressStep={supplyProgressStep} {steps} />
