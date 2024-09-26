<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import BtcSendAmount from './BtcSendAmount.svelte';
	import IcSendDestination from '$icp/components/send/IcSendDestination.svelte';
	import type { IcAmountAssertionError } from '$icp/types/ic-send';
	import SendSource from '$lib/components/send/SendSource.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { balance } from '$lib/derived/balances.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/stores/token.store';
	import type { NetworkId } from '$lib/types/network';

	export let networkId: NetworkId | undefined = undefined;
	export let amount: number | undefined = undefined;
	export let destination = '';
	export let source: string;

	let amountError: IcAmountAssertionError | undefined;
	let invalidDestination: boolean;

	const dispatch = createEventDispatcher();

	const close = () => dispatch('icClose');
</script>

<form on:submit={() => dispatch('icNext')} method="POST">
	<ContentWithToolbar>
		<IcSendDestination bind:destination bind:invalidDestination {networkId} on:icQRCodeScan />

		<BtcSendAmount bind:amount bind:amountError />

		<SendSource token={$token} balance={$balance} {source} />

		<!-- PENDING show fee -->

		<ButtonGroup slot="toolbar">
			<button type="button" class="secondary block flex-1" on:click={close}
				>{$i18n.core.text.cancel}</button
			>
			<button class="primary block flex-1" type="submit" disabled={false}>
				{$i18n.core.text.next}
			</button>
		</ButtonGroup>
	</ContentWithToolbar>
</form>
