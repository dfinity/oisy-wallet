<script lang="ts">
	import NetworksSwitcher from '$lib/components/networks/NetworksSwitcher.svelte';
	import ManageTokensButton from '$lib/components/tokens/ManageTokensButton.svelte';
	import TokensSignedIn from '$lib/components/tokens/TokensSignedIn.svelte';
	import TokensSignedOut from '$lib/components/tokens/TokensSignedOut.svelte';
	import { authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
</script>

<div class:pointer-events-none={$authNotSignedIn} class:blur-[1.5px]={$authNotSignedIn}>
	<div class="mb-6 flex items-center justify-between pb-1">
		<NetworksSwitcher disabled={$authNotSignedIn} />

		<ManageTokensButton />
	</div>

	{#if $authSignedIn}
		<TokensSignedIn />
	{:else}
		<TokensSignedOut />
	{/if}
</div>
