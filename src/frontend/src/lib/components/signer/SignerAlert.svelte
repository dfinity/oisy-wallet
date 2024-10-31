<script lang="ts">
	import type { ComponentType } from 'svelte';
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
	import IconClose from '$lib/components/icons/IconClose.svelte';

	export let alertType: 'ok' | 'error';

	let icon: ComponentType;
	$: icon = alertType === 'error' ? IconClose : IconCheck;
</script>

<div class="flex justify-center pb-5 pt-8">
	<div
		class="flex h-20 w-20 items-center justify-center rounded-full"
		class:bg-cyclamen={alertType === 'error'}
		class:bg-background-brand-primary={alertType === 'ok'}
	>
		<svelte:component this={icon} />
	</div>
</div>
