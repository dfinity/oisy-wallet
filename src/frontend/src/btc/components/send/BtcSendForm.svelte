<script lang="ts">
	import IcSendAmount from '$icp/components/send/IcSendAmount.svelte';
	import IcSendDestination from '$icp/components/send/IcSendDestination.svelte';
	import type { IcAmountAssertionError } from '$icp/types/ic-send';
	import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
	import SendSource from '$lib/components/send/SendSource.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { balance } from '$lib/derived/balances.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/stores/token.store';
	import type { NetworkId } from '$lib/types/network';
	import { createEventDispatcher } from 'svelte';

	export let networkId: NetworkId | undefined = undefined;
	export let amount: number | undefined = undefined;
	export let destination = '';

	let amountError: IcAmountAssertionError | undefined;
	let invalidDestination: boolean;

	const dispatch = createEventDispatcher();
</script>

<form on:submit={() => dispatch('icNext')} method="POST">
	<ContentWithToolbar>
		<IcSendDestination bind:destination bind:invalidDestination {networkId} on:icQRCodeScan />

		<IcSendAmount bind:amount bind:amountError {networkId} />

		<SendSource token={$token} balance={$balance} source="some-btc-address" />

		<!-- PENDING show fee -->

		<ButtonGroup slot="toolbar">
			<slot name="cancel" />
			<button class="primary block flex-1" type="submit" disabled={false}>
				{$i18n.core.text.next}
			</button>
		</ButtonGroup>
	</ContentWithToolbar>
</form>
