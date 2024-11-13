<script lang="ts">
	import type { ComponentType } from 'svelte';

	export let icon: ComponentType;
	export let iconStyleClass = '';
</script>

<div class="relative">
	<div
		class="rounded-full bg-brand-subtle-alt"
		style={`width: 2.9rem; aspect-ratio: 1/1;`}
	/>
	<svelte:component this={icon} styleClass={`inset-center ${iconStyleClass}`} />
</div>
