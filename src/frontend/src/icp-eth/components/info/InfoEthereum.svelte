<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import EthFeeStoreContext from '$eth/components/fee/EthFeeStoreContext.svelte';
	import { ethereumToken } from '$eth/derived/token.derived';
	import HowToConvertEthereumModal from '$icp/components/convert/HowToConvertEthereumModal.svelte';
	import type { IcCkToken, IcToken } from '$icp/types/ic-token';
	import eth from '$icp-eth/assets/eth.svg';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalHowToConvertToTwinTokenEth } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		sourceToken: IcToken;
		destinationToken: IcCkToken;
	}

	let { sourceToken, destinationToken }: Props = $props();

	const modalId = Symbol();

	const openReceive = () => modalStore.openHowToConvertToTwinTokenEth(modalId);
</script>

<div class="pr-2">
	<h4 class="flex items-center gap-2 font-medium">
		<Logo
			alt={replacePlaceholders($i18n.core.alt.logo, {
				$name: sourceToken.name
			})}
			src={eth}
		/>
		<span class="w-[70%]"
			>{replacePlaceholders($i18n.info.ethereum.title, {
				$ckToken: destinationToken.symbol
			})}</span
		>
	</h4>

	<p class="mt-3 text-tertiary">
		{replacePlaceholders(replaceOisyPlaceholders($i18n.info.ethereum.description), {
			$token: sourceToken.symbol,
			$ckToken: destinationToken.symbol,
			$network: sourceToken.network.name
		})}
	</p>

	<p class="mt-3 text-tertiary">
		{replacePlaceholders(replaceOisyPlaceholders($i18n.info.ethereum.note), {
			$token: sourceToken.symbol,
			$ckToken: destinationToken.symbol
		})}
	</p>

	<button class="primary mt-6" disabled={$isBusy} onclick={openReceive}>
		{replacePlaceholders($i18n.info.ethereum.how_to, {
			$ckToken: destinationToken.symbol
		})}</button
	>
</div>

{#if $modalHowToConvertToTwinTokenEth && nonNullish(sourceToken) && nonNullish(destinationToken)}
	<EthFeeStoreContext token={$ethereumToken}>
		<HowToConvertEthereumModal {destinationToken} {sourceToken} />
	</EthFeeStoreContext>
{/if}
