<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { addressNotLoaded } from '$lib/derived/address.derived';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalConvertETHToCkETH } from '$lib/derived/modal.derived';
	import IconImportExport from '$lib/components/icons/IconImportExport.svelte';
	import { waitWalletReady } from '$lib/services/actions.services';
	import CkEthLoader from '$icp-eth/components/core/CkEthLoader.svelte';
	import { isNullish } from '@dfinity/utils';
	import { ckEthHelperContractAddressStore } from '$icp-eth/stores/cketh.store';
	import { ICP_NETWORK } from '$lib/constants/networks.constants';
	import { setContext } from 'svelte';
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$eth/stores/send.store';
	import SendTokenModal from '$eth/components/send/SendTokenModal.svelte';
	import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
	import { tokenStandard } from '$lib/derived/token.derived';

	// Convert ETH to ckETH can be executed on Ethereum and ckETH pages, therefore we use Ethereum for both statically.
	const convertTokenId = ETHEREUM_TOKEN_ID;

	const isDisabled = (): boolean =>
		$addressNotLoaded || isNullish($ckEthHelperContractAddressStore?.[convertTokenId]);

	const openSend = async () => {
		if (isDisabled()) {
			const status = await waitWalletReady(isDisabled);

			if (status === 'timeout') {
				return;
			}
		}

		modalStore.openConvertETHToCkETH();
	};

	/**
	 * Send modal context store
	 */

	const context = initSendContext({ sendPurpose: 'convert-eth-to-cketh' });
	setContext<SendContext>(SEND_CONTEXT_KEY, context);
</script>

<svelte:window on:oisyOpenConvertEthToCkEth={openSend} />

<CkEthLoader>
	<button
		class="hero col-span-2"
		on:click={async () => await openSend()}
		disabled={$isBusy}
		class:opacity-50={$isBusy}
	>
		<IconImportExport size="28" />
		<span>
			{#if $tokenStandard === 'ethereum'}
				Convert ETH to ckETH
			{:else}
				Receive from ETH network
			{/if}
		</span></button
	>
</CkEthLoader>

{#if $modalConvertETHToCkETH}
	<SendTokenModal
		destination={$ckEthHelperContractAddressStore?.[convertTokenId]?.data ?? ''}
		network={ICP_NETWORK}
	/>
{/if}
