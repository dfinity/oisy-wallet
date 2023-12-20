<script lang="ts">
	import Transactions from '$lib/components/transactions/Transactions.svelte';
	import { routeNetwork, routeToken } from '$lib/derived/nav.derived';
	import { ICP_TOKEN } from '$lib/constants/tokens.constants';
	import IcpTransactions from '$lib/components/transactions/icp/IcpTransactions.svelte';
	import { AIRDROP } from '$lib/constants/airdrop.constants';
	import { nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { ICP_NETWORK_ID } from '$lib/constants/networks.constants';
	import { switchNetwork } from '$lib/utils/nav.utils';

	onMount(async () => {
		// A user is accessing the ICP transactions page without providing the network information
		if ($routeToken === ICP_TOKEN.name && $routeNetwork !== ICP_NETWORK_ID.description) {
			await switchNetwork(ICP_NETWORK_ID);
		}
	});
</script>

<h2 class="text-base mb-6 pb-1" class:mt-12={AIRDROP} class:mt-16={!AIRDROP}>Transactions</h2>

{#if $routeToken === ICP_TOKEN.name}
	<IcpTransactions />
{:else if nonNullish($routeToken)}
	<Transactions />
{/if}
