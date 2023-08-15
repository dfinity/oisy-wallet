<script lang="ts">
	import { authSignedInStore } from '$lib/stores/auth.store';
	import { signOut } from '$lib/services/auth.services';
	import Address from '$lib/components/dashboard/Address.svelte';
	import Balance from '$lib/components/dashboard/Balance.svelte';
	import Transactions from '$lib/components/dashboard/Transactions.svelte';
	import Send from '$lib/components/dashboard/Send.svelte';
	import Sockets from '$lib/components/core/Sockets.svelte';
	import SignIn from '$lib/components/core/SignIn.svelte';
	import Hero from '$lib/components/core/Hero.svelte';
	import Loader from '$lib/components/core/Loader.svelte';
</script>

{#if $authSignedInStore}
	<Sockets>
		<Hero />

		<Loader>
			<Address />

			<Balance />

			<Transactions />

			<Send />
		</Loader>
	</Sockets>

	<button on:click={signOut}>Sign-out</button>
{:else}
	<SignIn />
{/if}
