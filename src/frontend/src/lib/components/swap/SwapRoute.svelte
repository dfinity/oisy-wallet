<script lang="ts">
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let route: string[];
</script>

<ModalValue>
	<svelte:fragment slot="label">{$i18n.swap.text.swap_route}</svelte:fragment>

	<svelte:fragment slot="main-value">
		{#each route as r (r)}
			{r}
			{#if r !== route[route.length - 1]}&nbsp;→&nbsp;{/if}
		{/each}
	</svelte:fragment>
</ModalValue>
