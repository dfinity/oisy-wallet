<script lang="ts">
	import { token } from '$lib/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { Html } from '@dfinity/gix-components';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();
</script>

<div class="icon flex flex-col items-center gap-3">
	<Logo src={$token.icon} size="64px" alt={`${$token.name} logo`} color="off-white" />

	<p class="font-bold text-center">{$token.name}</p>
</div>

<p class="break-normal py-10"><Html text={$i18n.tokens.hide.info} /></p>

<div class="flex justify-end gap-1 mb-2">
	<button class="secondary" on:click={() => dispatch('icCancel')}>{$i18n.core.text.cancel}</button>
	<button class="primary" on:click={() => dispatch('icHide')}>
		{$i18n.tokens.hide.confirm}
	</button>
</div>

<style lang="scss">
	.icon {
		min-height: calc(64px + var(--padding-4x));
	}
</style>
