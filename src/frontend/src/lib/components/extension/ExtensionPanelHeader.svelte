<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { page } from '$app/state';
	import SeasonalIconAstronautHelmet from '$lib/components/core/SeasonalIconAstronautHelmet.svelte';
	import IconLogout from '$lib/components/icons/IconLogout.svelte';
	import IconMoreVertical from '$lib/components/icons/lucide/IconMoreVertical.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import ButtonMenu from '$lib/components/ui/ButtonMenu.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import Popover from '$lib/components/ui/Popover.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	interface Props {
		address?: string;
		onDisconnectAll: () => void;
		onLogOut: () => void;
	}

	let { address, onDisconnectAll, onLogOut }: Props = $props();

	let visible = $state(false);
	let button = $state<HTMLButtonElement | undefined>();

	const choose = (action: () => void) => () => {
		visible = false;
		action();
	};

	const openOisy = () => window.open(page.url.origin, '_blank', 'noopener,noreferrer');
</script>

<header class="flex items-center gap-3">
	<SeasonalIconAstronautHelmet />

	<div class="min-w-0 flex-1">
		{#if nonNullish(address)}
			<div
				class="flex w-fit max-w-full items-center gap-1 rounded-full bg-brand-subtle-20 py-1 pr-1 pl-3"
			>
				<span class="font-mono truncate text-sm" title={address}
					>{shortenWithMiddleEllipsis({ text: address, splitLength: 6 })}</span
				>
				<Copy inline text={$i18n.wallet.text.address_copied} value={address} />
			</div>
		{/if}
	</div>

	<ButtonIcon
		ariaLabel={$i18n.extension.panel.menu}
		colorStyle="tertiary-alt"
		expanded={visible}
		link={false}
		onclick={() => (visible = true)}
		bind:button
	>
		{#snippet icon()}
			<IconMoreVertical />
		{/snippet}
		{$i18n.extension.panel.menu}
	</ButtonIcon>
</header>

<Popover anchor={button} direction="rtl" bind:visible>
	<div class="flex max-w-80 flex-col gap-1">
		<ButtonMenu ariaLabel={$i18n.extension.panel.open_oisy} onclick={choose(openOisy)}>
			{$i18n.extension.panel.open_oisy}
		</ButtonMenu>

		<ButtonMenu ariaLabel={$i18n.extension.panel.disconnect_all} onclick={choose(onDisconnectAll)}>
			{$i18n.extension.panel.disconnect_all}
		</ButtonMenu>

		<Hr />

		<ButtonMenu ariaLabel={$i18n.auth.text.logout} onclick={choose(onLogOut)}>
			<IconLogout />
			{$i18n.auth.text.logout}
		</ButtonMenu>
	</div>
</Popover>
