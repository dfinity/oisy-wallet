<script lang="ts">
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import Html from '$lib/components/ui/Html.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		checked: boolean;
	}

	let { checked = $bindable() }: Props = $props();

	const inputId = 'harvest-stake-agreement';

	const handleCheckboxChange = () => {
		checked = !checked;
	};
</script>

<div class="my-6 flex items-start gap-4 rounded-xl bg-secondary p-2">
	<Checkbox {checked} {inputId} onChange={handleCheckboxChange} />

	<label class="block text-sm leading-snug text-tertiary" for={inputId}>
		<Html text={$i18n.stake.text.harvest_autopilot_stake_terms} />
	</label>
</div>
