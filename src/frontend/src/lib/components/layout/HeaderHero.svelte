<script lang="ts">
	import UserMenu from '$lib/components/core/UserMenu.svelte';
	import WalletConnect from '$lib/components/wallet-connect/WalletConnect.svelte';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
	import { page } from '$app/stores';
	import Back from '$lib/components/core/Back.svelte';
	import { isSubRoute } from '$lib/utils/nav.utils';
	import TokenSwitcher from '$lib/components/core/TokenSwitcher.svelte';

	let back = false;
	$: back = isSubRoute($page);
</script>

<header
	class="flex justify-between md:px-4 relative z-1 pointer-events-none"
	style="min-height: 78px"
>
	{#if back}
		<Back />
	{:else}
		<div class="flex p-4 items-center text-off-white">
			<OisyWalletLogo />
		</div>
	{/if}

	<div class="flex m-4 gap-4 pointer-events-auto" style="margin-left: auto">
		<WalletConnect />
		<TokenSwitcher />
		<UserMenu />
	</div>
</header>
