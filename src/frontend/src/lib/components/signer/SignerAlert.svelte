<script lang="ts">
	import type { ComponentType } from 'svelte';
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
	import IconClose from '$lib/components/icons/IconClose.svelte';

	export let type: 'ok' | 'error';

	let icon: ComponentType;
	$: icon = type === 'error' ? IconClose : IconCheck;
</script>

<div class="flex justify-center pt-8 pb-5">
	<div
		class="flex items-center justify-center w-20 h-20 rounded-full"
		class:bg-cyclamen={type === 'error'}
		class:bg-[var(--color-primary)]={type === 'ok'}
	>
		<svelte:component this={icon} />
	</div>
</div>
