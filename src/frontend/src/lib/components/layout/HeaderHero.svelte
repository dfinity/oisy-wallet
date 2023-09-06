<script lang="ts">
	import UserPrincipal from '$lib/components/core/UserPrincipal.svelte';
	import WalletConnect from '$lib/components/wallet-connect/WalletConnect.svelte';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
</script>

<header class="flex justify-between md:px-2 relative z-1">
	<div class="hidden md:flex md:p-2 items-center text-off-white">
		<OisyWalletLogo />
	</div>

	<div class="flex m-2 gap-2" style="margin-left: auto">
		<WalletConnect />
		<UserPrincipal />
	</div>
</header>
