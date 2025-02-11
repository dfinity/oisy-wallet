<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import IcReceiveWalletAddress from '$icp/components/receive/IcReceiveWalletAddress.svelte';
	import {
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';

	const { token, ckEthereumTwinToken, ckEthereumTwinTokenNetwork, close } =
		getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

	const dispatch = createEventDispatcher();
</script>

<ContentWithToolbar>
	<IcReceiveWalletAddress on:icQRCode />

	<Hr spacing="lg" />

	<Value ref="ethereum-helper-contract" element="div">
		<svelte:fragment slot="label"
			>{replacePlaceholders($i18n.receive.ethereum.text.from_network, {
				$network: $ckEthereumTwinTokenNetwork.name
			})}</svelte:fragment
		>

		<p class="py-2 break-normal text-misty-rose">
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

	<div class="gap-3 flex w-full flex-col" slot="toolbar">
		<Button paddingSmall colorStyle="secondary" on:click={() => dispatch('icConvert')}>
			<span class="text-dark-slate-blue font-bold"
				>{replacePlaceholders(
					replaceOisyPlaceholders($i18n.receive.ethereum.text.learn_how_to_convert),
					{
						$token: $ckEthereumTwinToken.symbol,
						$ckToken: $token.symbol
					}
				)}</span
			>
		</Button>

		<ButtonDone on:click={close} />
	</div>
</ContentWithToolbar>
