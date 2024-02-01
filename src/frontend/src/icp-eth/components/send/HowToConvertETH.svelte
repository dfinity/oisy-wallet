<script lang="ts">
	import { modalHowToConvertETHToCkETH } from '$lib/derived/modal.derived';
	import { setContext } from 'svelte';
	import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { IconInfo } from '@dfinity/gix-components';
	import ConvertETHToCkETH from '$icp-eth/components/send/ConvertETHToCkETH.svelte';
	import HowToConvertETHModal from '$icp-eth/components/send/HowToConvertETHModal.svelte';

	/**
	 * Send modal context store
	 */

	const context = initSendContext({ sendPurpose: 'convert-eth-to-cketh' });
	setContext<SendContext>(SEND_CONTEXT_KEY, context);
</script>

<ConvertETHToCkETH>
	<IconInfo size="28" />
	<span>How to convert ETH to ckETH</span>
</ConvertETHToCkETH>

{#if $modalHowToConvertETHToCkETH}
	<HowToConvertETHModal />
{/if}
