<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import IcFeeDisplay from './IcFeeDisplay.svelte';
	import IcSendAmount from '$icp/components/send/IcSendAmount.svelte';
	import IcSendDestination from '$icp/components/send/IcSendDestination.svelte';
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import type { IcAmountAssertionError } from '$icp/types/ic-send';
	import SendSource from '$lib/components/send/SendSource.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { balance } from '$lib/derived/balances.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/stores/token.store';
	import type { NetworkId } from '$lib/types/network';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

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
	<ContentWithToolbar>
		<IcSendDestination bind:destination bind:invalidDestination {networkId} on:icQRCodeScan />

		<IcSendAmount bind:amount bind:amountError {networkId} />

		<SendSource token={$token} balance={$balance} source={$icrcAccountIdentifierText ?? ''} />

		<IcFeeDisplay {networkId} />

		<ButtonGroup slot="toolbar">
			<slot name="cancel" />
			<button class="primary block flex-1" type="submit" disabled={invalid}>
				{$i18n.core.text.next}
			</button>
		</ButtonGroup>
	</ContentWithToolbar>
</form>
