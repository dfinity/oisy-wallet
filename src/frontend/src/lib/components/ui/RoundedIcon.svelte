<script lang="ts">
	import type { ComponentType } from 'svelte';

	export let icon: ComponentType;
	export let opacity = false;
</script>

<div
	class="p-3 relative flex items-center justify-center rounded-full bg-primary ring-1 ring-brand-subtle-20"
>
	<svelte:component this={icon} styleClass={opacity ? 'opacity-10' : ''} />
</div>
