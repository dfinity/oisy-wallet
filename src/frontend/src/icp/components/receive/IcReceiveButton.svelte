<script lang="ts">
	import { isBusy } from '$lib/derived/busy.derived';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
</script>

<button class="flex-1 hero" disabled={$isBusy} class:opacity-50={$isBusy} on:click>
	<IconReceive size="28" />
	<span>Receive</span></button
>
