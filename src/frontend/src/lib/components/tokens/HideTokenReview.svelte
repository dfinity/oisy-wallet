<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/stores/token.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	const dispatch = createEventDispatcher();
</script>

<ContentWithToolbar>
	<div class="icon flex flex-col items-center gap-3">
		<Logo
			alt={replacePlaceholders($i18n.core.alt.logo, { $name: $token?.name ?? '' })}
			color="off-white"
			size="xl"
			src={$token?.icon}
		/>

		<p class="text-center font-bold">
			{#if nonNullish($token)}
				{getTokenDisplaySymbol($token)}
			{:else}
				&ZeroWidthSpace;
			{/if}
		</p>
	</div>

	<p class="break-normal py-10">
		<Html text={$i18n.tokens.hide.info} />
	</p>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonCancel onclick={() => dispatch('icCancel')} />
			<Button onclick={() => dispatch('icHide')}>
				{$i18n.tokens.hide.confirm}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>

<style lang="scss">
	.icon {
		min-height: calc(64px + var(--padding-4x));
	}
</style>
