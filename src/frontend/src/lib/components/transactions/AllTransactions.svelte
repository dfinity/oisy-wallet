<script lang="ts">
	import AllTransactionsList from '$lib/components/transactions/AllTransactionsList.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<PageTitle>{$i18n.activity.text.title}</PageTitle>

<AllTransactionsList />
