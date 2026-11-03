<script lang="ts">
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { ProgressStepsCyclesTopUp } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ProgressSteps } from '$lib/types/progress-steps';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		canisterId: string;
		progressStep: string;
	}

	let { canisterId, progressStep }: Props = $props();

	let steps = $derived<ProgressSteps>([
		{
			step: ProgressStepsCyclesTopUp.INITIALIZATION,
			text: $i18n.send.text.initializing,
			state: 'in_progress'
		},
		{
			step: ProgressStepsCyclesTopUp.TOP_UP,
			text: replacePlaceholders($i18n.cycles_top_up.text.topping_up, {
				$canister: shortenWithMiddleEllipsis({ text: canisterId })
			}),
			state: 'next'
		}
	]);
</script>

<InProgressWizard {progressStep} {steps} />
