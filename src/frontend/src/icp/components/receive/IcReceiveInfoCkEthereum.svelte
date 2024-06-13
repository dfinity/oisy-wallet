<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
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
	import type { Token } from '$lib/types/token';
	import type { IcCkToken } from '$icp/types/ic';
	import { ETHEREUM_TOKEN } from '$env/tokens.env';
	import type { Network } from '$lib/types/network';

	const { token } = getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

	const dispatch = createEventDispatcher();

	let twinToken: Token;
	$: twinToken = ($token as IcCkToken)?.twinToken ?? ETHEREUM_TOKEN;

	let twinTokenNetwork: Network;
	$: twinTokenNetwork = twinToken.network;
</script>

<div class="stretch">
	<IcReceiveWalletAddress on:icQRCode />

	<div class="mb-6">
		<Hr />
	</div>

	<Value ref="ethereum-helper-contract" element="div">
		<svelte:fragment slot="label"
			>{replacePlaceholders($i18n.receive.ethereum.text.from_network, {
				$network: twinTokenNetwork.name
			})}</svelte:fragment
		>

		<p class="text-misty-rose break-normal py-2">
			{replacePlaceholders(
				replaceOisyPlaceholders($i18n.receive.ethereum.text.eth_to_cketh_description),
				{
					$token: twinToken.symbol,
					$ckToken: $token.symbol,
					$network: twinTokenNetwork.name
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
				$token: twinToken.symbol,
				$ckToken: $token.symbol
			}
		)}</span
	>
</button>

<button class="primary full center text-center" on:click={modalStore.close}
	>{$i18n.core.text.done}</button
>
