<script>
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { i18n } from '$lib/stores/i18n.store';
    import AllAirdropsList from "$lib/components/airdrops/AllAirdropsList.svelte";
</script>

<PageTitle>{$i18n.airdrops.text.title}</PageTitle>

<AllAirdropsList />
