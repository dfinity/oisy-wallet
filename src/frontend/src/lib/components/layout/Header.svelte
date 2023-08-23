<script lang="ts">
	import InternetComputerLogo from '$lib/components/icons/InternetComputerLogo.svelte';
	import { authSignedInStore } from '$lib/stores/auth.store';
	import UserPrincipal from '$lib/components/core/UserPrincipal.svelte';
	import WalletConnect from '$lib/components/wallet-connect/WalletConnect.svelte';
</script>

<header class="flex justify-between">
	<div class="hidden md:block md:p-2">
		<InternetComputerLogo />
	</div>

	{#if $authSignedInStore}
		<div class="flex m-2 gap-2" style="margin-left: auto">
			<WalletConnect />
			<UserPrincipal />
		</div>
	{/if}
</header>
