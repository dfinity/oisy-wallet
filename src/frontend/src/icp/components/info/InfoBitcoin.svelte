<script lang="ts">
	import bitcoin from '$btc/assets/bitcoin.svg';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { emit } from '$lib/utils/events.utils';

	const openReceive = () => emit({ message: 'oisyReceiveCkBTC' });
</script>

<div class="pr-2">
	<h4 class="flex items-center gap-2 font-medium">
		<Logo alt="Bitcoin logo" src={bitcoin} />
		<span>{$i18n.info.bitcoin.title}</span>
	</h4>

	<p class="mt-3 text-tertiary">
		{$i18n.info.bitcoin.description}
	</p>

	<p class="mt-3 text-tertiary">
		{$i18n.info.bitcoin.note}
	</p>

	<button class="primary mt-6" disabled={$isBusy} onclick={openReceive}>
		{$i18n.info.bitcoin.how_to}</button
	>
</div>
