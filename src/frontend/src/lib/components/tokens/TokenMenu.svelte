<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import IconEllipsisHorizontal from '$lib/components/icons/IconEllipsisHorizontal.svelte';
	import ButtonMenu from '$lib/components/ui/ButtonMenu.svelte';
	import { networkICP } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	let visible = false;
	let button: HTMLButtonElement | undefined;

	const openToken = () => {
		const fn = $networkICP ? modalStore.openIcToken : modalStore.openToken;
		fn();

		visible = false;
	};
</script>

<button
	class="text-primary pointer-events-auto ml-auto flex gap-0.5 font-bold"
	bind:this={button}
	on:click={() => (visible = true)}
	aria-label={$i18n.tokens.alt.context_menu}
	disabled={$erc20UserTokensNotInitialized}
>
	<IconEllipsisHorizontal />
</button>

<Popover bind:visible anchor={button} invisibleBackdrop direction="rtl">
	<div class="flex flex-col gap-3">
		<slot />

		<ButtonMenu ariaLabel={$i18n.tokens.details.title} on:click={openToken}>
			{$i18n.tokens.details.title}
		</ButtonMenu>
	</div>
</Popover>
