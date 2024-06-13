<script lang="ts">
	import eth from '$icp-eth/assets/eth.svg';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { modalHowToConvertToTwinTokenEth } from '$lib/derived/modal.derived';
	import HowToConvertEthereumModal from '$icp/components/convert/HowToConvertEthereumModal.svelte';
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { setContext } from 'svelte';
	import { ckEthereumTwinToken, ckEthereumTwinTokenNetwork } from '$icp-eth/derived/cketh.derived';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/derived/token.derived';

	const openReceive = () => modalStore.openHowToConvertToTwinTokenEth();

	/**
	 * Send modal context store
	 */

	const { sendToken, ...rest } = initSendContext({
		sendPurpose:
			$ckEthereumTwinToken.standard === 'erc20'
				? 'convert-erc20-to-ckerc20'
				: 'convert-eth-to-cketh',
		token: $ckEthereumTwinToken
	});
	setContext<SendContext>(SEND_CONTEXT_KEY, {
		sendToken,
		...rest
	});

	$: sendToken.set($ckEthereumTwinToken);
</script>

<div class="pr-2">
	<h4 class="flex gap-2 items-center font-medium">
		<Logo
			src={eth}
			alt={replacePlaceholders($i18n.core.alt.logo, {
				$name: $ckEthereumTwinToken.name
			})}
		/>
		<span class="w-[70%]"
			>{replacePlaceholders($i18n.info.ethereum.title, {
				$token: $ckEthereumTwinToken.symbol,
				$ckToken: $token.symbol
			})}</span
		>
	</h4>

	<p class="text-misty-rose mt-3">
		{replacePlaceholders(replaceOisyPlaceholders($i18n.info.ethereum.description), {
			$token: $ckEthereumTwinToken.symbol,
			$tkName: $ckEthereumTwinToken.name,
			$ckToken: $token.symbol,
			$network: $ckEthereumTwinTokenNetwork.name
		})}
	</p>

	<button class="primary mt-6" disabled={$isBusy} class:opacity-50={$isBusy} on:click={openReceive}>
		{replacePlaceholders($i18n.info.ethereum.how_to, {
			$token: $ckEthereumTwinToken.symbol,
			$ckToken: $token.symbol
		})}</button
	>
</div>

{#if $modalHowToConvertToTwinTokenEth}
	<HowToConvertEthereumModal />
{/if}
