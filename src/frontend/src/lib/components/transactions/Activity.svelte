<script lang="ts">
	import AllTransactions from '$lib/components/transactions/AllTransactions.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<PageTitle>{$i18n.activity.text.title}</PageTitle>

<AllTransactions />
