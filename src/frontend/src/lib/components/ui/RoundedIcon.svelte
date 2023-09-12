<script lang="ts">
	import type { SvelteComponent } from 'svelte';

	export let icon: typeof SvelteComponent;
	export let backgroundStyleClass = 'bg-dark-blue opacity-15';
	export let iconStyleClass = '';
</script>

<div class="relative">
	<div class={`rounded-50 ${backgroundStyleClass}`} style="width: 3rem; aspect-ratio: 1/1" />
	<svelte:component this={icon} styleClass={`inset-center ${iconStyleClass}`} />
</div>
