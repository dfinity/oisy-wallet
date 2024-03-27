<script lang="ts">
	import SendSource from '$lib/components/send/SendSource.svelte';
	import { createEventDispatcher } from 'svelte';
	import { token } from '$lib/derived/token.derived';
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import IcFeeDisplay from './IcFeeDisplay.svelte';
	import type { NetworkId } from '$lib/types/network';
	import IcSendAmount from '$icp/components/send/IcSendAmount.svelte';
	import IcSendDestination from '$icp/components/send/IcSendDestination.svelte';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { IcAmountAssertionError } from '$icp/types/ic-send';
	import { balance } from '$lib/derived/balances.derived';
	import { i18n } from '$lib/stores/i18n.store';

	export let destination = '';
	export let amount: number | undefined = undefined;
	export let networkId: NetworkId | undefined = undefined;

	let amountError: IcAmountAssertionError | undefined;
	let invalidDestination: boolean;

	let invalid = true;
	$: invalid =
		invalidDestination ||
		nonNullish(amountError) ||
		isNullishOrEmpty(destination) ||
		isNullish(amount);

	const dispatch = createEventDispatcher();
</script>

<form on:submit={() => dispatch('icNext')} method="POST">
	<IcSendDestination bind:destination bind:invalidDestination {networkId} />

	<IcSendAmount bind:amount bind:amountError {networkId} />

	<SendSource token={$token} balance={$balance} source={$icrcAccountIdentifierText ?? ''} />

	<IcFeeDisplay {networkId} />

	<div class="flex justify-end gap-1">
		<button type="button" class="secondary" on:click={() => dispatch('icClose')}
			>{$i18n.core.text.cancel}</button
		>
		<button class="primary" type="submit" disabled={invalid} class:opacity-10={invalid}>
			{$i18n.core.text.next}
		</button>
	</div>
</form>
