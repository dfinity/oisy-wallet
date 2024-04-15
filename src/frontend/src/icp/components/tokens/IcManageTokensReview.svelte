<script lang="ts">
	import type { KnownIcrcToken } from '$lib/types/known-token';
	import { i18n } from '$lib/stores/i18n.store';
	import { isNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import Value from '$lib/components/ui/Value.svelte';

	export let token: KnownIcrcToken | undefined;

	let invalid = true;
	$: invalid = isNullish(token);

	const dispatch = createEventDispatcher();
</script>

<Value ref="symbol" element="div">
	<svelte:fragment slot="label">Symbol</svelte:fragment>
	{token?.metadata.symbol ?? ''}
</Value>

<Value ref="ledgerId" element="div">
	<svelte:fragment slot="label">Ledger ID</svelte:fragment>
	{token?.ledgerCanisterId ?? ''}
</Value>

<div class="flex justify-end gap-1 mb-2">
	<button class="secondary" on:click={() => dispatch('icBack')}>{$i18n.core.text.back}</button>
	<button
		class="primary"
		disabled={invalid}
		class:opacity-10={invalid}
		on:click={() => dispatch('icSave')}
	>
		{$i18n.core.text.save}
	</button>
</div>
