<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import SendData from '$lib/components/send/SendData.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionBalance } from '$lib/types/balance';
	import type { OptionToken } from '$lib/types/token';

	export let destination = '';
	export let amount: number | undefined = undefined;
	export let source: string;
	export let token: OptionToken;
	export let balance: OptionBalance;
	export let disabled: boolean | undefined = false;

	const dispatch = createEventDispatcher();
</script>

<ContentWithToolbar>
	{#if nonNullish(token)}
		<SendData {amount} {destination} {token} {balance} {source}>
			<slot name="fee" slot="fee" />

			<slot name="network" slot="network" />
		</SendData>
	{/if}

	<ButtonGroup slot="toolbar">
		<ButtonBack on:click={() => dispatch('icBack')} />
		<Button {disabled} on:click={() => dispatch('icSend')}>
			{$i18n.send.text.send}
		</Button>
	</ButtonGroup>
</ContentWithToolbar>
