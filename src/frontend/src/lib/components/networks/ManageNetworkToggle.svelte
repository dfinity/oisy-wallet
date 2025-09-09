<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		checked?: boolean;
		disabled?: boolean;
		testId?: string;
	}

	let { checked = false, disabled = false, testId = undefined }: Props = $props();
</script>

<Toggle
	ariaLabel={checked ? $i18n.settings.text.disable_network : $i18n.settings.text.enable_network}
	{checked}
	{disabled}
	{testId}
	on:nnsToggle
/>
