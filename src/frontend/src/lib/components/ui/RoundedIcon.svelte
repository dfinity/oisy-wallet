<script lang="ts">
	import type { ComponentType } from 'svelte';

	export let icon: ComponentType;
	export let opacity = false;
</script>

<div
	class="p-3 relative flex items-center justify-center rounded-full bg-primary ring-2 ring-brand-subtle"
>
	<svelte:component this={icon} styleClass={opacity ? 'opacity-10' : ''} />
</div>
