<script>
	import AllAirdropsList from '$lib/components/airdrops/AllAirdropsList.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<PageTitle>{$i18n.airdrops.text.title}</PageTitle>

<AllAirdropsList />
