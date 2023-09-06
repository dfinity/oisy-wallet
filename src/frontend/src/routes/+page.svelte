<script lang="ts">
	import Transactions from '$lib/components/dashboard/Transactions.svelte';
	import Listener from '$lib/components/core/Listener.svelte';
	import SignIn from '$lib/components/core/SignIn.svelte';
	import Hero from '$lib/components/dashboard/Hero.svelte';
	import Loader from '$lib/components/core/Loader.svelte';
	import Tabs from '$lib/components/core/Tabs.svelte';
	import Tokens from '$lib/components/dashboard/Tokens.svelte';
	import { authSignedInStore } from '$lib/derived/auth.derived';
	import SignInBackground from '$lib/components/core/SignInBackground.svelte';
</script>

{#if $authSignedInStore}
	<Listener>
		<Hero />

		<Loader>
			<Tabs>
				<Tokens slot="tokens" />
				<Transactions slot="transactions" />
			</Tabs>
		</Loader>
	</Listener>
{:else}
	<SignIn />

	<SignInBackground />
{/if}
