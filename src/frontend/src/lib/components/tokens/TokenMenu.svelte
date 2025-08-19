<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import type { Snippet } from 'svelte';
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
	import { pageToken, pageTokenToggleable } from '$lib/derived/page-token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		testId?: string;
		children: Snippet;
	}

	const { testId, children }: Props = $props();

	let visible = $state(false);
	let button = $state<HTMLButtonElement | undefined>();
	let fromRoute = $state<NavigationTarget | undefined>();

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

	let hideTokenLabel = $derived(
		replacePlaceholders($i18n.tokens.hide.token, {
			$token: nonNullish($pageToken) ? getTokenDisplaySymbol($pageToken) : ''
		})
	);
</script>

<button
	bind:this={button}
	class="pointer-events-auto ml-auto flex gap-0.5 font-bold"
	aria-label={$i18n.tokens.alt.context_menu}
	data-tid={`${testId}-button`}
	disabled={$erc20UserTokensNotInitialized}
	onclick={() => (visible = true)}
>
	<IconMoreVertical />
</button>

<Popover anchor={button} direction="rtl" invisibleBackdrop bind:visible>
	<div class="flex flex-col gap-1">
		{#if $pageTokenToggleable}
			<ButtonMenu ariaLabel={hideTokenLabel} onclick={hideToken}>
				{hideTokenLabel}
			</ButtonMenu>
		{/if}

		{@render children()}

		<ButtonMenu ariaLabel={$i18n.tokens.details.title} onclick={openToken}>
			{$i18n.tokens.details.title}
		</ButtonMenu>
	</div>
</Popover>
