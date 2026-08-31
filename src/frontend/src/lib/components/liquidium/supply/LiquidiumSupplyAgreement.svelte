<script lang="ts">
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		checked: boolean;
	}

	let { checked = $bindable() }: Props = $props();

	const inputId = 'liquidium-supply-agreement';

	const handleCheckboxChange = () => {
		checked = !checked;
	};
</script>

<div class="my-6 flex items-start gap-4 rounded-xl bg-secondary p-2">
	<Checkbox {checked} {inputId} onChange={handleCheckboxChange} />

	<label class="block text-sm leading-snug text-tertiary" for={inputId}>
		{$i18n.liquidium.text.supply_agreement}
	</label>
</div>
