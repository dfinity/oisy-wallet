<script lang="ts">
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		checked?: boolean;
		disabled?: boolean;
		testId?: string;
		onToggle: () => void;
	}

	let { checked = false, disabled = false, testId, onToggle }: Props = $props();
</script>

<Toggle
	ariaLabel={checked ? $i18n.settings.text.disable_network : $i18n.settings.text.enable_network}
	{checked}
	{disabled}
	{onToggle}
	{testId}
/>
