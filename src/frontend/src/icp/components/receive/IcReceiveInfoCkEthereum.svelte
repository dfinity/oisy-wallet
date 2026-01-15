<script lang="ts">
	import { getContext } from 'svelte';
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
	import type { ReceiveQRCode } from '$lib/types/receive';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		onQRCode: (details: ReceiveQRCode) => void;
		onHowToConvert: () => void;
	}

	let { onQRCode, onHowToConvert }: Props = $props();

	const { token, ckEthereumTwinToken, ckEthereumTwinTokenNetwork, close } =
		getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);
</script>

<ContentWithToolbar>
	<IcReceiveWalletAddress {onQRCode} />

	<Hr spacing="lg" />

	<Value element="div" ref="ethereum-helper-contract">
		{#snippet label()}
			{replacePlaceholders($i18n.receive.ethereum.text.from_network, {
				$network: $ckEthereumTwinTokenNetwork.name
			})}
		{/snippet}

		{#snippet content()}
			<p class="py-2 break-normal text-tertiary">
				{replacePlaceholders(
					replaceOisyPlaceholders($i18n.receive.ethereum.text.eth_to_cketh_description),
					{
						$token: $ckEthereumTwinToken.symbol,
						$ckToken: $token.symbol,
						$network: $ckEthereumTwinTokenNetwork.name
					}
				)}
			</p>
		{/snippet}
	</Value>

	{#snippet toolbar()}
		<div class="flex w-full flex-col gap-3">
			<Button colorStyle="secondary" onclick={onHowToConvert} paddingSmall>
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

			<ButtonDone onclick={close} />
		</div>
	{/snippet}
</ContentWithToolbar>
