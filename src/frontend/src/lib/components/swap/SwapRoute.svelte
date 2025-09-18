<script lang="ts">
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		route: string[];
	}

	let { route }: Props = $props();
</script>

<ModalValue>
	{#snippet label()}
		{$i18n.swap.text.swap_route}
	{/snippet}

	{#snippet mainValue()}
		{#each route as r (r)}
			{r}
			{#if r !== route[route.length - 1]}&nbsp;→&nbsp;{/if}
		{/each}
	{/snippet}
</ModalValue>
