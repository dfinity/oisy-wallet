<script lang="ts">
	import { setContext } from 'svelte';
	import HowToConvertEthereumModal from '$icp/components/convert/HowToConvertEthereumModal.svelte';
	import eth from '$icp-eth/assets/eth.svg';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalHowToConvertToTwinTokenEth } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Token } from '$lib/types/token';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';

	export let twinToken: Token;
	export let ckTokenSymbol: string;

	const openReceive = () => modalStore.openHowToConvertToTwinTokenEth();

	/**
	 * Send modal context store
	 */

	const { sendToken, ...rest } = initSendContext({
		sendPurpose:
			twinToken.standard === 'erc20' ? 'convert-erc20-to-ckerc20' : 'convert-eth-to-cketh',
		token: twinToken
	});
	setContext<SendContext>(SEND_CONTEXT_KEY, {
		sendToken,
		...rest
	});

	$: sendToken.set(twinToken);
</script>

<div class="pr-2">
	<h4 class="gap-2 font-medium flex items-center">
		<Logo
			src={eth}
			alt={replacePlaceholders($i18n.core.alt.logo, {
				$name: twinToken.name
			})}
		/>
		<span class="w-[70%]"
			>{replacePlaceholders($i18n.info.ethereum.title, {
				$ckToken: ckTokenSymbol
			})}</span
		>
	</h4>

	<p class="mt-3">
		{replacePlaceholders(replaceOisyPlaceholders($i18n.info.ethereum.description), {
			$token: twinToken.symbol,
			$ckToken: ckTokenSymbol,
			$network: twinToken.network.name
		})}
	</p>

	<p class="mt-3">
		{replacePlaceholders(replaceOisyPlaceholders($i18n.info.ethereum.note), {
			$token: twinToken.symbol,
			$ckToken: ckTokenSymbol
		})}
	</p>

	<button class="primary mt-6" disabled={$isBusy} on:click={openReceive}>
		{replacePlaceholders($i18n.info.ethereum.how_to, {
			$ckToken: ckTokenSymbol
		})}</button
	>
</div>

{#if $modalHowToConvertToTwinTokenEth}
	<HowToConvertEthereumModal />
{/if}
