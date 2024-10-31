<script lang="ts">
	import IconInfo from '$lib/components/icons/lucide/IconInfo.svelte';

	export let alertType: 'info' | 'light-warning' = 'info';
</script>

<div
	class="mb-4 flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium sm:text-base"
	class:bg-onahau={alertType === 'info'}
	class:bg-warning-orange={alertType === 'light-warning'}
>
	<div
		class="min-w-5"
		class:text-blue-ribbon={alertType === 'info'}
		class:text-american-orange={alertType === 'light-warning'}
	>
		<IconInfo />
	</div>
	<div>
		<slot />
	</div>
</div>
