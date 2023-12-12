<script lang="ts">
	import Transactions from '$lib/components/transactions/Transactions.svelte';
	import { routeToken } from '$lib/derived/nav.derived';
	import { ICP_TOKEN } from '$lib/constants/tokens.constants';
	import IcpTransactions from '$lib/components/transactions/icp/IcpTransactions.svelte';
	import { AIRDROP } from '$lib/constants/airdrop.constants';
	import { nonNullish } from '@dfinity/utils';
</script>

<h2 class="text-base mb-6 pb-1" class:mt-12={AIRDROP} class:mt-16={!AIRDROP}>Transactions</h2>

{#if $routeToken === ICP_TOKEN.name}
	<IcpTransactions />
{:else if nonNullish($routeToken)}
	<Transactions />
{/if}
