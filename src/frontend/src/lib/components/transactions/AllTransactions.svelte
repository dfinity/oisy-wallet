<script lang="ts">
	import AllTransactionsList from '$lib/components/transactions/AllTransactionsList.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class="flex flex-col gap-5">
	<PageTitle>{$i18n.activity.text.title}</PageTitle>

	<MessageBox level="plain">
		{$i18n.activity.info.btc_transactions}
	</MessageBox>

	<AllTransactionsList />
</div>
