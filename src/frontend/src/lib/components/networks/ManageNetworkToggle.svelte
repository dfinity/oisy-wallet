<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';

	export let checked = false;
	export let disabled = false;
	export let testId: string | undefined = undefined;
</script>

<Toggle
	ariaLabel={checked ? $i18n.settings.text.disable_network : $i18n.settings.text.enable_network}
	{checked}
	{disabled}
	{testId}
	on:nnsToggle
/>
