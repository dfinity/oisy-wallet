<script lang="ts">
	import type { Component } from 'svelte';
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
	import IconClose from '$lib/components/icons/IconClose.svelte';

	interface Props {
		alertType: 'ok' | 'error';
	}

	let { alertType }: Props = $props();

	let icon: Component = $derived(alertType === 'error' ? IconClose : IconCheck);

	const SvelteComponent = $derived(icon);
</script>

<div class="flex justify-center pb-5 pt-8">
	<div
		class="flex h-20 w-20 items-center justify-center rounded-full text-white"
		class:bg-brand-primary={alertType === 'ok'}
		class:bg-error-primary={alertType === 'error'}
	>
		<SvelteComponent />
	</div>
</div>
