<script lang="ts">
	import Hr from '$lib/components/ui/Hr.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
	import IcReceiveWalletAddress from '$icp/components/receive/IcReceiveWalletAddress.svelte';
	import { createEventDispatcher, getContext } from 'svelte';
	import {
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';

	const { token, ckEthereumTwinToken, ckEthereumTwinTokenNetwork, close } =
		getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

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

<button class="primary full center text-center" on:click={close}>{$i18n.core.text.done}</button>
