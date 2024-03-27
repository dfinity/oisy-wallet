<script lang="ts">
	import { isBusy } from '$lib/derived/busy.derived';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<button class="flex-1 hero" disabled={$isBusy} class:opacity-50={$isBusy} on:click>
	<IconReceive size="28" />
	<span>{$i18n.receive.text.receive}</span></button
>
