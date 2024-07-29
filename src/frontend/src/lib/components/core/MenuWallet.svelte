<script lang="ts">
	import Hr from '$lib/components/ui/Hr.svelte';
	import {
		networkEthereum,
		networkICP,
		pseudoNetworkChainFusion
	} from '$lib/derived/network.derived';
	import EthWalletAddress from '$eth/components/core/EthWalletAddress.svelte';
	import IcWalletAddress from '$icp/components/core/IcWalletAddress.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import ButtonMenu from '$lib/components/ui/ButtonMenu.svelte';
	import WalletAddresses from '$lib/components/core/WalletAddresses.svelte';
	import IconWalletConnect from '$lib/components/icons/IconWalletConnect.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { walletConnectPaired } from '$eth/stores/wallet-connect.store';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	const click = () => dispatch('icMenuClick');

	const openWalletConnectAuth = () => {
		click();
		modalStore.openWalletConnectAuth();
	};
</script>

{#if $networkICP}
	<IcWalletAddress />
{:else if $networkEthereum}
	<EthWalletAddress />
{:else if $pseudoNetworkChainFusion}
	<WalletAddresses on:icReceiveTriggered={click} />
{/if}

<Hr />

<ButtonMenu
	ariaLabel={$i18n.wallet_connect.text.name}
	on:click={openWalletConnectAuth}
	disabled={$walletConnectPaired}
>
	<IconWalletConnect />
	{$i18n.wallet_connect.text.name}
</ButtonMenu>

<Hr />
