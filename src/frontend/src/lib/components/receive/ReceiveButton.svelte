<script lang="ts">
	import { isBusy } from '$lib/derived/busy.derived';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { IconQRCodeScanner } from '@dfinity/gix-components';

	export let compact = false;
</script>

<button
	class:flex-1={!compact}
	class:hero={!compact}
	class:text-blue={compact}
	class:hover:text-dark-blue={compact}
	class:active:text-dark-blue={compact}
	disabled={$isBusy}
	class:opacity-50={$isBusy}
	on:click
	aria-label={$i18n.receive.text.receive}
>
	{#if compact}
		<IconQRCodeScanner />
	{:else}
		<IconReceive size="28" />
		<span>{$i18n.receive.text.receive}</span>{/if}</button
>
