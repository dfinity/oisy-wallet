<script lang="ts">
	import type { ComponentType } from 'svelte';

	export let icon: ComponentType;
	export let iconSize = '2.9rem';
	export let backgroundStyleClass = 'bg-brand-subtle-alt';
	export let iconStyleClass = '';
	export let additionalStyleClass = '';
</script>

<div class="relative">
	<div
		class={`rounded-full ${backgroundStyleClass}`}
		style={`width: ${iconSize}; aspect-ratio: 1/1; ${additionalStyleClass}`}
	/>
	<svelte:component this={icon} styleClass={`inset-center ${iconStyleClass}`} />
</div>
