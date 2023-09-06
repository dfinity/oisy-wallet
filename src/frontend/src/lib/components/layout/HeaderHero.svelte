<script lang="ts">
	import UserPrincipal from '$lib/components/core/UserPrincipal.svelte';
	import WalletConnect from '$lib/components/wallet-connect/WalletConnect.svelte';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
	import { page } from '$app/stores';
	import Back from '$lib/components/core/Back.svelte';

	let back = false;
	$: back = $page.route.id === '/(app)/transactions';
</script>

<header class="flex justify-between md:px-2 relative z-1">
	{#if back}
		<Back />
	{:else}
		<div class="flex p-2 items-center text-off-white">
			<OisyWalletLogo />
		</div>
	{/if}

	<div class="flex m-2 gap-2" style="margin-left: auto">
		<WalletConnect />
		<UserPrincipal />
	</div>
</header>
