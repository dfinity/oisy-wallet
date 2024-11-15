<script lang="ts">
	import type { ComponentType } from 'svelte';

	export let icon: ComponentType;
	export let withOpacity = false;
</script>

<div
	class="relative flex items-center justify-center rounded-full bg-primary p-3 ring-2 ring-brand-subtle"
>
	<div class:opacity-10={withOpacity}>
		<svelte:component this={icon}  />
	</div>
</div>
