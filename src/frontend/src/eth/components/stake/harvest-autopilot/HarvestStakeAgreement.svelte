<script lang="ts">
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import Html from '$lib/components/ui/Html.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		checked: boolean;
	}

	let { checked = $bindable() }: Props = $props();

	const handleCheckboxChange = () => {
		checked = !checked;
	};
</script>

<div class="my-6 flex gap-4 rounded-xl bg-secondary p-2">
	<Checkbox {checked} inputId="harvest-stake-agreement" onChange={handleCheckboxChange} />

	<span class="text-sm text-tertiary">
		<Html text={$i18n.stake.text.harvest_autopilot_stake_terms} />
	</span>
</div>
