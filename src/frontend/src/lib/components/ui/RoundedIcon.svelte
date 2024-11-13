<script lang="ts">
	import type { ComponentType } from 'svelte';

	export let icon: ComponentType;
	export let iconStyleClass = '';
</script>

<div
	class="relative flex items-center justify-center rounded-full bg-primary p-3 ring-2 ring-brand-subtle"
>
	<svelte:component this={icon} styleClass={iconStyleClass} />
</div>
