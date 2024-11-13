<script lang="ts">
	import type { ComponentType } from 'svelte';

	export let icon: ComponentType;
	export let iconStyleClass = '';
</script>

<div class="relative">
	<div class="aspect-square w-12 rounded-full bg-brand-subtle-alt" />
	<svelte:component this={icon} styleClass={`inset-center ${iconStyleClass}`} />
</div>
