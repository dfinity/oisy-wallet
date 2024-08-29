<script lang="ts">
	import { authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
	import TokensMenu from '$lib/components/tokens/TokensMenu.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import TokensSignedIn from '$lib/components/tokens/TokensSignedIn.svelte';
	import TokensSignedOut from '$lib/components/tokens/TokensSignedOut.svelte';
	import ManageTokensButton from '$lib/components/tokens/ManageTokensButton.svelte';
	import NetworksSwitcher from '$lib/components/networks/NetworksSwitcher.svelte';
	import BtcModal from '$btc/components/BtcModal.svelte';

	let showBtc = false;

	const openBtc = () => {
		showBtc = true;
	};

	const closeBtc = () => {
		showBtc = false;
	};
</script>

<div class:pointer-events-none={$authNotSignedIn} class:blur-[1.5px]={$authNotSignedIn}>
	<Header>
		<NetworksSwitcher disabled={$authNotSignedIn} />

		<TokensMenu slot="end" />
	</Header>

	{#if $authSignedIn}
		<TokensSignedIn />
	{:else}
		<TokensSignedOut />
	{/if}

	<ManageTokensButton />

	{#if showBtc}
		<BtcModal on:nnsClose={closeBtc} />
	{/if}

	<div>
		<button on:click={openBtc} class="primary">Open BTC</button>
	</div>
</div>
