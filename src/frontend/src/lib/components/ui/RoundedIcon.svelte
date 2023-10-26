<script lang="ts">
	import type { ComponentType } from 'svelte';

	export let icon: ComponentType;
	export let iconSize = '2.9rem';
	export let backgroundStyleClass = 'bg-dark-blue opacity-15';
	export let iconStyleClass = '';
</script>

<div class="relative">
	<div class={`rounded-50 ${backgroundStyleClass}`} style={`width: ${iconSize}; aspect-ratio: 1/1`} />
	<svelte:component this={icon} styleClass={`inset-center ${iconStyleClass}`} />
</div>
