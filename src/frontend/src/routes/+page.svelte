<script lang="ts">
	import { authSignedInStore } from '$lib/stores/auth.store';
	import Transactions from '$lib/components/dashboard/Transactions.svelte';
	import Sockets from '$lib/components/core/Sockets.svelte';
	import SignIn from '$lib/components/core/SignIn.svelte';
	import Hero from '$lib/components/dashboard/Hero.svelte';
	import Loader from '$lib/components/core/Loader.svelte';
	import Tabs from '$lib/components/core/Tabs.svelte';
</script>

{#if $authSignedInStore}
	<Sockets>
		<Hero />

		<Loader>
			<Tabs>
				<Transactions slot="transactions" />
			</Tabs>
		</Loader>
	</Sockets>
{:else}
	<SignIn />
{/if}
