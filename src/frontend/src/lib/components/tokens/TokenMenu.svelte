<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import IconMoreVertical from '$lib/components/icons/IconMoreVertical.svelte';
	import ButtonMenu from '$lib/components/ui/ButtonMenu.svelte';
	import {
		networkBitcoin,
		networkEthereum,
		networkICP,
		networkSolana
	} from '$lib/derived/network.derived';
	import { tokenToggleable } from '$lib/derived/token.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { token } from '$lib/stores/token.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let testId: string | undefined = undefined;

	let visible = false;
	let button: HTMLButtonElement | undefined;

	const hideToken = () => {
		const fn = $networkICP ? modalStore.openIcHideToken : modalStore.openHideToken;
		fn();

		visible = false;
	};

	const openToken = () => {
		const fn = $networkICP
			? modalStore.openIcToken
			: $networkEthereum
				? modalStore.openEthToken
				: $networkBitcoin
					? modalStore.openBtcToken
					: $networkSolana
						? modalStore.openSolToken
						: () => {};
		fn();

		visible = false;
	};

	let hideTokenLabel: string;
	$: hideTokenLabel = replacePlaceholders($i18n.tokens.hide.token, {
		$token: $token?.name ?? ''
	});
</script>

<button
	data-tid={`${testId}-button`}
	class="gap-0.5 font-bold pointer-events-auto ml-auto flex"
	bind:this={button}
	on:click={() => (visible = true)}
	aria-label={$i18n.tokens.alt.context_menu}
	disabled={$erc20UserTokensNotInitialized}
>
	<IconMoreVertical />
</button>

<Popover bind:visible anchor={button} invisibleBackdrop direction="rtl">
	<div class="gap-3 flex flex-col">
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
