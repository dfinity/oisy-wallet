<script lang="ts">
	import type { Component } from 'svelte';
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
	import IconClose from '$lib/components/icons/IconClose.svelte';

	export let alertType: 'ok' | 'error';

	let icon: Component;
	$: icon = alertType === 'error' ? IconClose : IconCheck;
</script>

<div class="flex justify-center pb-5 pt-8">
	<div
		class="flex h-20 w-20 items-center justify-center rounded-full text-white"
		class:bg-error-primary={alertType === 'error'}
		class:bg-brand-primary={alertType === 'ok'}
	>
		<svelte:component this={icon} />
	</div>
</div>
