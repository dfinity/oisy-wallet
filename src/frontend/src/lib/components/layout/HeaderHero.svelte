<script lang="ts">
	import Menu from '$lib/components/core/Menu.svelte';
	import WalletConnect from '$eth/components/wallet-connect/WalletConnect.svelte';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
	import { page } from '$app/stores';
	import Back from '$lib/components/core/Back.svelte';
	import { isSubRoute } from '$lib/utils/nav.utils';
	import NetworksSwitcher from '$lib/components/networks/NetworksSwitcher.svelte';

	let back = false;
	$: back = isSubRoute($page);
</script>

<header
	class="flex justify-between md:px-4 relative z-10 pointer-events-none"
	style="min-height: 78px"
>
	{#if back}
		<Back />
	{:else}
		<div class="flex p-4 items-center text-off-white">
			<OisyWalletLogo />
		</div>
	{/if}

	<div class="flex m-4 gap-4 pointer-events-auto ml-auto">
		<WalletConnect />
		<NetworksSwitcher />
		<Menu />
	</div>
</header>
