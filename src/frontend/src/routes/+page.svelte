<script lang="ts">
	import { authSignedInStore } from '$lib/stores/auth.store';
	import { signIn, signOut } from '$lib/services/auth.services';
	import EthAddress from '$lib/components/EthAddress.svelte';
	import Balance from '$lib/components/Balance.svelte';
	import Transactions from '$lib/components/Transactions.svelte';
</script>

{#if $authSignedInStore}
	<EthAddress />

	<Balance />

	<Transactions />

	<button on:click={signOut}>Sign-out</button>
{:else}
	<button on:click={signIn}>Sign-in</button>
{/if}
