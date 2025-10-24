<script lang="ts">
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
	import IconClose from '$lib/components/icons/IconClose.svelte';

	interface Props {
		alertType: 'ok' | 'error';
	}

	let { alertType }: Props = $props();

	let Icon = $derived(alertType === 'error' ? IconClose : IconCheck);
</script>

<div class="flex justify-center pt-8 pb-5">
	<div
		class="flex h-20 w-20 items-center justify-center rounded-full text-white"
		class:bg-brand-primary={alertType === 'ok'}
		class:bg-error-primary={alertType === 'error'}
	>
		<Icon />
	</div>
</div>
