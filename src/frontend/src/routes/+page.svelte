<script lang="ts">
	import Transactions from '$lib/components/dashboard/Transactions.svelte';
	import Sockets from '$lib/components/core/Sockets.svelte';
	import SignIn from '$lib/components/core/SignIn.svelte';
	import Hero from '$lib/components/dashboard/Hero.svelte';
	import Loader from '$lib/components/core/Loader.svelte';
	import Tabs from '$lib/components/core/Tabs.svelte';
	import Tokens from '$lib/components/dashboard/Tokens.svelte';
	import { authSignedInStore } from '$lib/derived/auth.derived';
</script>

{#if $authSignedInStore}
	<Sockets>
		<Hero />

		<Loader>
			<Tabs>
				<Tokens slot="tokens" />
				<Transactions slot="transactions" />
			</Tabs>
		</Loader>
	</Sockets>
{:else}
	<SignIn />
{/if}
