<script lang="ts">
	import { assertNonNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import type { Lamports } from '@solana/rpc-types';
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import Value from '$lib/components/ui/Value.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getSolCreateAccountFee } from '$sol/api/solana.api';
	import { type FeeContext, SOL_FEE_CONTEXT_KEY } from '$sol/stores/sol-fee.store';
	import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';

	export let showAtaFee = false;

	const { sendTokenNetworkId } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const {
		feeStore: fee,
		feeDecimalsStore: decimals,
		feeSymbolStore: symbol
	}: FeeContext = getContext<FeeContext>(SOL_FEE_CONTEXT_KEY);

	let ataFee: Lamports | undefined = undefined;

	const updateAtaFee = async () => {
		if (!showAtaFee) {
			ataFee = undefined;
			return;
		}

		const solNetwork = mapNetworkIdToNetwork($sendTokenNetworkId);

		assertNonNullish(
			solNetwork,
			replacePlaceholders($i18n.init.error.no_solana_network, {
				$network: $sendTokenNetworkId.description ?? ''
			})
		);

		ataFee = await getSolCreateAccountFee(solNetwork);
	};

	$: showAtaFee, $sendTokenNetworkId, updateAtaFee();
</script>

<Value ref="fee">
	<svelte:fragment slot="label">{$i18n.fee.text.fee}</svelte:fragment>

	{#if nonNullish($fee) && nonNullish($decimals) && nonNullish($symbol)}
		{formatToken({
			value: BigNumber.from($fee),
			unitName: $decimals,
			displayDecimals: $decimals
		})}
		{$symbol}
	{/if}
</Value>

{#if showAtaFee && nonNullish(ataFee)}
	<div transition:slide={SLIDE_DURATION}>
		<Value ref="ataFee">
			<svelte:fragment slot="label">{$i18n.fee.text.ata_fee}</svelte:fragment>

			{#if nonNullish($decimals) && nonNullish($symbol)}
				{formatToken({
					value: BigNumber.from(ataFee),
					unitName: $decimals,
					displayDecimals: $decimals
				})}
				{$symbol}
			{/if}
		</Value>
	</div>
{/if}
