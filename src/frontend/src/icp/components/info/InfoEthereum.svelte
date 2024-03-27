<script lang="ts">
	import eth from '$icp-eth/assets/eth.svg';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { modalHowToConvertETHToCkETH } from '$lib/derived/modal.derived';
	import HowToConvertETHModal from '$icp/components/convert/HowToConvertETHModal.svelte';
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { setContext } from 'svelte';
	import { ckETHTwinToken } from '$icp-eth/derived/cketh.derived';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { ETHEREUM_NETWORK } from '$env/networks.env';

	const openReceive = () => modalStore.openHowToConvertETHToCkETH();

	/**
	 * Send modal context store
	 */

	const { sendToken, ...rest } = initSendContext({
		sendPurpose: 'convert-eth-to-cketh',
		token: $ckETHTwinToken
	});
	setContext<SendContext>(SEND_CONTEXT_KEY, {
		sendToken,
		...rest
	});

	$: sendToken.set($ckETHTwinToken);
</script>

<div class="pr-2">
	<h4 class="flex gap-2 items-center font-medium">
		<Logo
			src={eth}
			size="20px"
			alt={replacePlaceholders($i18n.core.alt.logo, {
				$name: ETHEREUM_NETWORK.name
			})}
		/>
		<span class="w-[70%]">{$i18n.info.ethereum.title}</span>
	</h4>

	<p class="text-misty-rose mt-3">
		{replaceOisyPlaceholders($i18n.info.ethereum.description)}
	</p>

	<button class="primary mt-6" disabled={$isBusy} class:opacity-50={$isBusy} on:click={openReceive}>
		{$i18n.info.ethereum.how_to}</button
	>
</div>

{#if $modalHowToConvertETHToCkETH}
	<HowToConvertETHModal />
{/if}
