<script lang="ts">
	import NetworksSwitcher from '$lib/components/networks/NetworksSwitcher.svelte';
	import AllTransactionsList from '$lib/components/transactions/AllTransactionsList.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { testnetsEnabled } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class="flex flex-col gap-5">
	<PageTitle>{$i18n.activity.text.title}</PageTitle>

	{#if $testnetsEnabled}
		<div>
			<NetworksSwitcher />
		</div>
	{/if}

	<MessageBox level="plain" closableKey="oisy_ic_hide_bitcoin_activity">
		{$i18n.activity.info.btc_transactions}
	</MessageBox>

	<AllTransactionsList />
</div>
