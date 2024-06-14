<script lang="ts">
	import { token } from '$lib/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { Html } from '@dfinity/gix-components';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { createEventDispatcher } from 'svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import { networkICP } from '$lib/derived/network.derived';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	const dispatch = createEventDispatcher();
</script>

<div class="stretch">
	<div class="icon flex flex-col items-center gap-3">
		<Logo
			src={$token.icon}
			size="big"
			alt={replacePlaceholders($i18n.core.alt.logo, { $name: $token.name })}
			color="off-white"
		/>

		<p class="font-bold text-center">{$token.name}</p>
	</div>

	<p class="break-normal py-10">
		<Html
			text={replacePlaceholders($i18n.tokens.hide.info, {
				$where: $networkICP ? $i18n.tokens.manage.text.title : $i18n.tokens.import.text.title
			})}
		/>
	</p>
</div>

<ButtonGroup>
	<button class="secondary block flex-1" on:click={() => dispatch('icCancel')}
		>{$i18n.core.text.cancel}</button
	>
	<button class="primary block flex-1" on:click={() => dispatch('icHide')}>
		{$i18n.tokens.hide.confirm}
	</button>
</ButtonGroup>

<style lang="scss">
	.icon {
		min-height: calc(64px + var(--padding-4x));
	}
</style>
