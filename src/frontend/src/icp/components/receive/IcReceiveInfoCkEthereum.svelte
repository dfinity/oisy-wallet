<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import Hr from '$lib/components/ui/Hr.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
	import IcReceiveWalletAddress from '$icp/components/receive/IcReceiveWalletAddress.svelte';
	import { createEventDispatcher } from 'svelte';
	import { ckEthereumTwinToken, ckEthereumTwinTokenNetwork } from '$icp-eth/derived/cketh.derived';
	import { token } from '$lib/derived/token.derived';

	const dispatch = createEventDispatcher();
</script>

<div class="stretch">
	<IcReceiveWalletAddress on:icQRCode />

	<div class="mb-6">
		<Hr />
	</div>

	<Value ref="ethereum-helper-contract" element="div">
		<svelte:fragment slot="label"
			>{replacePlaceholders($i18n.receive.ethereum.text.from_network, {
				$network: $ckEthereumTwinTokenNetwork.name
			})}</svelte:fragment
		>

		<p class="text-misty-rose break-normal py-2">
			{replacePlaceholders(
				replaceOisyPlaceholders($i18n.receive.ethereum.text.eth_to_cketh_description),
				{
					$token: $ckEthereumTwinToken.symbol,
					$ckToken: $token.symbol,
					$network: $ckEthereumTwinTokenNetwork.name
				}
			)}
		</p>
	</Value>
</div>

<button class="secondary full center mb-8" on:click={() => dispatch('icConvert')}>
	<span class="text-dark-slate-blue font-bold"
		>{replacePlaceholders(
			replaceOisyPlaceholders($i18n.receive.ethereum.text.learn_how_to_convert),
			{
				$token: $ckEthereumTwinToken.symbol,
				$ckToken: $token.symbol
			}
		)}</span
	>
</button>

<button class="primary full center text-center" on:click={modalStore.close}
	>{$i18n.core.text.done}</button
>
