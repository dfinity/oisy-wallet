<script lang="ts">
	import type { Component } from 'svelte';

	export let icon: Component;
	export let opacity = false;
</script>

<div
	class="p-3 relative flex items-center justify-center rounded-full bg-primary ring-2 ring-brand-subtle-10"
>
	<svelte:component this={icon} styleClass={opacity ? 'opacity-10' : ''} />
</div>
