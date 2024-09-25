<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import BtcWalletAddress from '$btc/components/core/BtcWalletAddress.svelte';
	import EthWalletAddress from '$eth/components/core/EthWalletAddress.svelte';
	import { walletConnectPaired } from '$eth/stores/wallet-connect.store';
	import IcWalletAddress from '$icp/components/core/IcWalletAddress.svelte';
	import WalletAddresses from '$lib/components/core/WalletAddresses.svelte';
	import IconWalletConnect from '$lib/components/icons/IconWalletConnect.svelte';
	import ButtonMenu from '$lib/components/ui/ButtonMenu.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { TRACK_COUNT_WALLET_CONNECT_MENU_OPEN } from '$lib/constants/analytics.contants';
	import {
		networkBitcoin,
		networkEthereum,
		networkICP,
		pseudoNetworkChainFusion
	} from '$lib/derived/network.derived';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	const dispatch = createEventDispatcher();

	const click = () => dispatch('icMenuClick');

	const openWalletConnectAuth = async () => {
		click();
		modalStore.openWalletConnectAuth();

		await trackEvent({
			name: TRACK_COUNT_WALLET_CONNECT_MENU_OPEN
		});
	};
</script>

{#if $networkICP}
	<IcWalletAddress />
{:else if $networkEthereum}
	<EthWalletAddress />
{:else if $networkBitcoin}
	<BtcWalletAddress />
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
