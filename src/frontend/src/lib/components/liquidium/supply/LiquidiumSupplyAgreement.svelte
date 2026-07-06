<script lang="ts">
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
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
	<Checkbox
		{checked}
		inputId="liquidium-supply-agreement"
		onChange={handleCheckboxChange}
		text="block"
	>
		<span class="text-sm text-tertiary">
			{$i18n.liquidium.text.supply_agreement}
		</span>
	</Checkbox>
</div>
