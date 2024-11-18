<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { createEventDispatcher, getContext, onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { selectUtxosFee as selectUtxosFeeApi } from '$btc/services/btc-send.services';
	import type { UtxosFee } from '$btc/types/btc-send';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import { formatToken } from '$lib/utils/format.utils';
	import { mapNetworkIdToBitcoinNetwork } from '$lib/utils/network.utils';

	export let utxosFee: UtxosFee | undefined = undefined;
	export let amount: OptionAmount = undefined;
	export let networkId: NetworkId | undefined = undefined;

	const { sendTokenDecimals } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const dispatch = createEventDispatcher();

	const selectUtxosFee = async () => {
		try {
			// all required params should be already defined at this stage
			if (isNullish(amount) || isNullish(networkId) || isNullish($authIdentity)) {
				return;
			}

			const network = mapNetworkIdToBitcoinNetwork(networkId);

			utxosFee = nonNullish(network)
				? await selectUtxosFeeApi({
						amount,
						network,
						identity: $authIdentity
					})
				: undefined;
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.send.error.unexpected_utxos_fee },
				err
			});

			dispatch('icBack');
		}
	};

	onMount(async () => {
		if (isNullish(utxosFee)) {
			await selectUtxosFee();
		}
	});
</script>

<Value ref="utxos-fee" element="div">
	<svelte:fragment slot="label">{$i18n.fee.text.fee}</svelte:fragment>

	{#if isNullish(utxosFee)}
		<span class="mt-2 block w-full max-w-[140px]"><SkeletonText /></span>
	{:else}
		<span in:fade>
			{formatToken({
				value: BigNumber.from(utxosFee.feeSatoshis),
				unitName: $sendTokenDecimals,
				displayDecimals: $sendTokenDecimals
			})}
		</span>
		BTC
	{/if}
</Value>
