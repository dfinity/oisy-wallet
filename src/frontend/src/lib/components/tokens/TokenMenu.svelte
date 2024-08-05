<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
	import IconMore from '$lib/components/icons/IconMore.svelte';
	import { networkICP } from '$lib/derived/network.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { tokenToggleable } from '$lib/derived/token.derived';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import ButtonMenu from '$lib/components/ui/ButtonMenu.svelte';
	import { token } from '$lib/stores/token.store';
	import ButtonHero from '$lib/components/ui/ButtonHero.svelte';

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

<ButtonHero
	bind:button
	on:click={() => (visible = true)}
	ariaLabel={$i18n.tokens.alt.context_menu}
	disabled={$erc20UserTokensNotInitialized}
>
	<IconMore size="28" slot="icon" />
	{$i18n.core.text.more}
</ButtonHero>

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
