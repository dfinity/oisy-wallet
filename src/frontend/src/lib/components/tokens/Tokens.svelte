<script lang="ts">
	import { fade } from 'svelte/transition';
	import ManageTokensButton from '$lib/components/tokens/ManageTokensButton.svelte';
	import TokensMenu from '$lib/components/tokens/TokensMenu.svelte';
	import TokensSignedIn from '$lib/components/tokens/TokensSignedIn.svelte';
	import TokensSignedOut from '$lib/components/tokens/TokensSignedOut.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import { authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
</script>

<div class:pointer-events-none={$authNotSignedIn} class:blur-[1.5px]={$authNotSignedIn}>
	<Header>
		<h2 class="text-base">Tokens</h2>

		<TokensMenu slot="end" />
	</Header>

	{#if $authSignedIn}
		<TokensSignedIn />

		<div transition:fade class="mb-4 mt-12 flex w-full justify-center sm:w-auto">
			<ManageTokensButton />
		</div>
	{:else}
		<TokensSignedOut />
	{/if}
</div>
