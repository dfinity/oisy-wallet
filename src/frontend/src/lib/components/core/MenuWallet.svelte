<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { walletConnectPaired } from '$eth/stores/wallet-connect.store';
	import IconWalletConnect from '$lib/components/icons/IconWalletConnect.svelte';
	import ButtonMenu from '$lib/components/ui/ButtonMenu.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	const dispatch = createEventDispatcher();

	const click = () => dispatch('icMenuClick');

	const openWalletConnectAuth = async () => {
		click();
		modalStore.openWalletConnectAuth();
	};
</script>

<ButtonMenu
	ariaLabel={$i18n.wallet_connect.text.name}
	on:click={openWalletConnectAuth}
	disabled={$walletConnectPaired}
>
	<IconWalletConnect />
	{$i18n.wallet_connect.text.name}
</ButtonMenu>

<Hr />
