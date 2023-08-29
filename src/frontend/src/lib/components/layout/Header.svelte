<script lang="ts">
	import UserPrincipal from '$lib/components/core/UserPrincipal.svelte';
	import WalletConnect from '$lib/components/wallet-connect/WalletConnect.svelte';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
    import {authSignedInStore} from "$lib/derived/auth.derived";
</script>

<header class="flex justify-between md:px-2" style="min-height: 75px">
	{#if $authSignedInStore}
		<div class="hidden md:flex md:p-2 items-center">
			<OisyWalletLogo />
		</div>

		<div class="flex m-2 gap-2" style="margin-left: auto">
			<WalletConnect />
			<UserPrincipal />
		</div>
	{/if}
</header>
