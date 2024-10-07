<script lang="ts">
	import { getContext } from 'svelte';
	import type { Erc20Token } from '$eth/types/erc20';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import Info from '$lib/components/ui/Info.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	const { sendToken, sendPurpose } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let displayInfo: boolean;
	$: displayInfo = ['convert-eth-to-cketh', 'convert-erc20-to-ckerc20'].includes(sendPurpose);

	let sendTokenAsErc20: Erc20Token | undefined;
	$: sendTokenAsErc20 = $sendToken.standard === 'erc20' ? ($sendToken as Erc20Token) : undefined;
</script>

{#if displayInfo}
	<Info>
		<span>
			{#if sendPurpose === 'convert-eth-to-cketh'}
				{$i18n.convert.text.cketh_conversions_may_take}
			{:else}
				{replacePlaceholders($i18n.convert.text.ckerc20_conversions_may_take, {
					$ckErc20: sendTokenAsErc20?.twinTokenSymbol ?? ''
				})}
			{/if}
		</span>
	</Info>
{/if}
