<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import NetworkInfo from '$lib/components/networks/NetworkInfo.svelte';
	import SendSource from '$lib/components/send/SendSource.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ButtonNext from '$lib/components/ui/ButtonNext.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { SEND_FORM_NEXT_BUTTON } from '$lib/constants/test-ids.constants';
	import type { OptionBalance } from '$lib/types/balance';
	import type { Network } from '$lib/types/network';
	import type { OptionToken } from '$lib/types/token';

	export let source: string | undefined = undefined;
	export let disabled: boolean | undefined = false;
	export let token: OptionToken;
	export let balance: OptionBalance;
	export let hideSource = false;

	let network: Network | undefined;
	$: network = nonNullish(token) ? token.network : undefined;

	const dispatch = createEventDispatcher();
</script>

<form on:submit={() => dispatch('icNext')} method="POST">
	<ContentWithToolbar>
		<slot name="amount" />

		<slot name="destination" />

		{#if !hideSource && nonNullish(source)}
			<SendSource {token} {balance} {source} />
		{/if}

		{#if nonNullish(network)}
			<NetworkInfo {network} />
		{/if}

		<slot name="fee" />

		<slot name="info" />

		<ButtonGroup slot="toolbar" testId="toolbar">
			<slot name="cancel" />

			<ButtonNext {disabled} testId={SEND_FORM_NEXT_BUTTON} />
		</ButtonGroup>
	</ContentWithToolbar>
</form>
