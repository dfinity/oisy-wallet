<script lang="ts">
	import UserMenu from '$lib/components/core/UserMenu.svelte';
	import WalletConnect from '$lib/components/wallet-connect/WalletConnect.svelte';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
	import { page } from '$app/stores';
	import Back from '$lib/components/core/Back.svelte';
	import { isSubRoute } from '$lib/utils/nav.utils';

	let back = false;
	$: back = isSubRoute($page);
</script>

<header
	class="flex justify-between md:px-2 relative z-1 pointer-events-none"
	style="min-height: 76px"
>
	{#if back}
		<Back />
	{:else}
		<div class="flex p-2 items-center text-off-white">
			<OisyWalletLogo />
		</div>
	{/if}

	<div class="flex m-2 gap-2 pointer-events-all" style="margin-left: auto">
		<WalletConnect />
		<UserMenu />
	</div>
</header>
