<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { afterNavigate } from '$app/navigation';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import IconMoreVertical from '$lib/components/icons/lucide/IconMoreVertical.svelte';
	import ButtonMenu from '$lib/components/ui/ButtonMenu.svelte';
	import {
		networkBitcoin,
		networkEthereum,
		networkEvm,
		networkICP,
		networkSolana
	} from '$lib/derived/network.derived';
	import { tokenToggleable } from '$lib/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { token } from '$lib/stores/token.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	export let testId: string | undefined = undefined;

	let visible = false;
	let button: HTMLButtonElement | undefined;
	let fromRoute: NavigationTarget | undefined;

	afterNavigate(({ from }) => {
		fromRoute = from ?? undefined;
	});

	const hideModalId = Symbol();
	const openModalId = Symbol();

	const hideToken = () => {
		const fn = $networkICP
			? modalStore.openIcHideToken
			: $networkSolana
				? modalStore.openSolHideToken
				: modalStore.openHideToken;
		fn({
			id: hideModalId,
			data: fromRoute
		});

		visible = false;
	};

	const openToken = () => {
		const fn = $networkICP
			? modalStore.openIcToken
			: $networkEthereum || $networkEvm
				? modalStore.openEthToken
				: $networkBitcoin
					? modalStore.openBtcToken
					: $networkSolana
						? modalStore.openSolToken
						: () => {};
		fn({
			id: openModalId,
			data: fromRoute
		});

		visible = false;
	};

	let hideTokenLabel: string;
	$: hideTokenLabel = replacePlaceholders($i18n.tokens.hide.token, {
		$token: nonNullish($token) ? getTokenDisplaySymbol($token) : ''
	});
</script>

<button
	data-tid={`${testId}-button`}
	class="pointer-events-auto ml-auto flex gap-0.5 font-bold"
	bind:this={button}
	on:click={() => (visible = true)}
	aria-label={$i18n.tokens.alt.context_menu}
	disabled={$erc20UserTokensNotInitialized}
>
	<IconMoreVertical />
</button>

<Popover bind:visible anchor={button} invisibleBackdrop direction="rtl">
	<div class="flex flex-col gap-1">
		{#if $tokenToggleable}
			<ButtonMenu ariaLabel={hideTokenLabel} onclick={hideToken}>
				{hideTokenLabel}
			</ButtonMenu>
		{/if}

		<slot />

		<ButtonMenu ariaLabel={$i18n.tokens.details.title} onclick={openToken}>
			{$i18n.tokens.details.title}
		</ButtonMenu>
	</div>
</Popover>
