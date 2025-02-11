<script lang="ts">
	import type { ComponentType } from 'svelte';
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
	import IconClose from '$lib/components/icons/IconClose.svelte';

	export let alertType: 'ok' | 'error';

	let icon: ComponentType;
	$: icon = alertType === 'error' ? IconClose : IconCheck;
</script>

<div class="pt-8 pb-5 flex justify-center">
	<div
		class="h-20 w-20 flex items-center justify-center rounded-full"
		class:bg-cyclamen={alertType === 'error'}
		class:bg-brand-primary={alertType === 'ok'}
	>
		<svelte:component this={icon} />
	</div>
</div>
