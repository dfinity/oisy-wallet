<script lang="ts">
	import IconInfo from '$lib/components/icons/lucide/IconInfo.svelte';

	export let level: 'info' | 'light-warning' = 'info';
</script>

<div
	class="mb-4 flex items-start gap-4 rounded-xl px-4 py-3 text-sm font-medium sm:text-base"
	class:bg-brand-subtle-alt={level === 'info'}
	class:bg-warning-subtle={level === 'light-warning'}
>
	<div
		class="min-w-5 py-0 sm:py-0.5"
		class:text-brand-primary={level === 'info'}
		class:text-warning={level === 'light-warning'}
	>
		<IconInfo />
	</div>
	<div>
		<slot />
	</div>
</div>
