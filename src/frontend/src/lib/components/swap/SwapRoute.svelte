<script lang="ts">
	import ModalValue from '$lib/components/ui/ModalValue.svelte';

	export let route: string[];
</script>

<ModalValue>
	<svelte:fragment slot="label">Swap route</svelte:fragment>

	<svelte:fragment slot="main-value">
		{#each route as r}
			{r}{#if r !== route[route.length - 1]}&nbsp;→&nbsp;{/if}
		{/each}
	</svelte:fragment>
</ModalValue>
