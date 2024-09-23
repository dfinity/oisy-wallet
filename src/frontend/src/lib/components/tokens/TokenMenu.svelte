<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import IconEllipsisHorizontal from '$lib/components/icons/IconEllipsisHorizontal.svelte';
	import ButtonMenu from '$lib/components/ui/ButtonMenu.svelte';
	import { networkICP } from '$lib/derived/network.derived';
	import { tokenToggleable } from '$lib/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { token } from '$lib/stores/token.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	let visible = false;
	let button: HTMLButtonElement | undefined;

	const hideToken = () => {
		const fn = $networkICP ? modalStore.openIcHideToken : modalStore.openHideToken;
		fn();

		visible = false;
	};

	const openToken = () => {
		const fn = $networkICP ? modalStore.openIcToken : modalStore.openToken;
		fn();

		visible = false;
	};

	let hideTokenLabel: string;
	$: hideTokenLabel = replacePlaceholders($i18n.tokens.hide.token, {
		$token: $token?.name ?? ''
	});
</script>

<button
	class="pointer-events-auto ml-auto flex gap-0.5 font-bold text-primary"
	bind:this={button}
	on:click={() => (visible = true)}
	aria-label={$i18n.tokens.alt.context_menu}
	disabled={$erc20UserTokensNotInitialized}
>
	<IconEllipsisHorizontal />
</button>

<Popover bind:visible anchor={button} invisibleBackdrop direction="rtl">
	<div class="flex flex-col gap-3">
		{#if $tokenToggleable}
			<ButtonMenu ariaLabel={hideTokenLabel} on:click={hideToken}>
				{hideTokenLabel}
			</ButtonMenu>
		{/if}

		<slot />

		<ButtonMenu ariaLabel={$i18n.tokens.details.title} on:click={openToken}>
			{$i18n.tokens.details.title}
		</ButtonMenu>
	</div>
</Popover>
