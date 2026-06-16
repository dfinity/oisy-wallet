<script lang="ts">
	import { Checkbox, Html } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		checked: boolean;
	}

	let { checked = $bindable() }: Props = $props();

	const handleCheckboxChange = () => {
		checked = !checked;
	};
</script>

<div class="bg-secondary my-6 flex gap-4 rounded-xl p-2">
	<Checkbox inputId="harvest-stake-agreement" bind:checked on:nnsChange={handleCheckboxChange} />

	<span class="text-tertiary text-sm">
		<Html text={$i18n.stake.text.harvest_autopilot_stake_terms} />
	</span>
</div>
