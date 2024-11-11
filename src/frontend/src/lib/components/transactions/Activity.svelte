<script lang="ts">
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import AllTransactions from '$lib/components/transactions/AllTransactions.svelte';
</script>

<PageTitle>{$i18n.activity.text.title}</PageTitle>

<AllTransactions />
