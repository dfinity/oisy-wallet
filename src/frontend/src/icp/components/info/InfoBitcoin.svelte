<script lang="ts">
	import bitcoin from '$icp/assets/bitcoin.svg';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { emit } from '$lib/utils/events.utils';
	import { i18n } from '$lib/stores/i18n.store';

	const openReceive = () => emit({ message: 'oisyReceiveCkBTC' });
</script>

<div class="pr-2">
	<h4 class="flex gap-2 items-center font-medium">
		<Logo src={bitcoin} size="20px" alt={`Bitcoin logo`} />
		<span>{$i18n.info.bitcoin.title}</span>
	</h4>

	<p class="text-misty-rose mt-3">
		{$i18n.info.bitcoin.description}
	</p>

	<p class="text-misty-rose mt-3">
		{$i18n.info.bitcoin.note}
	</p>

	<button class="primary mt-6" disabled={$isBusy} class:opacity-50={$isBusy} on:click={openReceive}>
		{$i18n.info.bitcoin.action}</button
	>
</div>
