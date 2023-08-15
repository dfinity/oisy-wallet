<script lang="ts">
	import { authSignedInStore } from '$lib/stores/auth.store';
	import { signOut } from '$lib/services/auth.services';
	import Address from '$lib/components/Address.svelte';
	import Balance from '$lib/components/Balance.svelte';
	import Transactions from '$lib/components/Transactions.svelte';
	import Send from '$lib/components/Send.svelte';
	import Sockets from '$lib/components/Sockets.svelte';
	import SignIn from '$lib/components/core/SignIn.svelte';
</script>

{#if $authSignedInStore}
	<Sockets>
		<Address>
			<Balance />

			<Transactions />

			<Send />
		</Address>
	</Sockets>

	<button on:click={signOut}>Sign-out</button>
{:else}
	<SignIn />
{/if}
