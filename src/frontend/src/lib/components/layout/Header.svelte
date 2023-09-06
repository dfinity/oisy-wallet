<script lang="ts">
	import UserPrincipal from '$lib/components/core/UserPrincipal.svelte';
	import WalletConnect from '$lib/components/wallet-connect/WalletConnect.svelte';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
	import { authSignedInStore } from '$lib/derived/auth.derived';
	import AirDrop from '$lib/components/core/AirDrop.svelte';
</script>

<header
	class="flex md:px-2 relative z-1"
	style="min-height: 75px"
	class:justify-between={$authSignedInStore}
	class:justify-center={!$authSignedInStore}
	class:sm:pb-4={!$authSignedInStore}
>
	{#if $authSignedInStore}
		<div class="hidden md:flex md:p-2 items-center">
			<OisyWalletLogo />
		</div>

		<div class="flex m-2 gap-2" style="margin-left: auto">
			<WalletConnect />
			<UserPrincipal />
		</div>
	{:else}
		<AirDrop />
	{/if}
</header>
