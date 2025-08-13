<script lang="ts">
	import { Backdrop, Popover } from '@dfinity/gix-components';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import IconHide from '$lib/components/icons/IconHide.svelte';
	import IconManage from '$lib/components/icons/lucide/IconManage.svelte';
	import TokensZeroBalanceToggle from '$lib/components/tokens/TokensZeroBalanceToggle.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import NotificationBlob from '$lib/components/ui/NotificationBlob.svelte';
	import { hideZeroBalances } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { emit } from '$lib/utils/events.utils';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';

	let visible = $state(false);
	let button = $state<HTMLButtonElement | undefined>();

	const manageTokensId = Symbol();

	const toggleHideZeros = () => {
		document.dispatchEvent(new CustomEvent('toggleHideZeros'));
		emit({ message: 'oisyToggleZeroBalances' });
	};

	const openManageTokens = () => {
		modalStore.openManageTokens({ id: manageTokensId });
		visible = false;
	};
</script>

<ButtonIcon
	bind:button
	onclick={() => (visible = true)}
	ariaLabel={$i18n.navigation.alt.menu}
	disabled={$erc20UserTokensNotInitialized}
	link={false}
	colorStyle="muted"
	styleClass={visible ? 'active' : ''}
>
	{#snippet icon()}
		<NotificationBlob display={$hideZeroBalances} position="top-right">
			<IconManage />
		</NotificationBlob>
	{/snippet}
</ButtonIcon>

{#snippet content()}
	<span class="mb-2 flex text-sm font-bold">{$i18n.tokens.manage.text.list_settings}</span>
	<ul class="flex list-none flex-col">
		<li class="logo-button-list-item">
			<LogoButton dividers onClick={toggleHideZeros}>
				{#snippet logo()}
					<IconHide />
				{/snippet}
				{#snippet title()}
					<span class="text-sm font-normal">{$i18n.tokens.text.hide_zero_balances}</span>
				{/snippet}
				{#snippet action()}
					<TokensZeroBalanceToggle />
				{/snippet}
			</LogoButton>
		</li>
		<li class="logo-button-list-item">
			<LogoButton dividers onClick={openManageTokens}>
				{#snippet logo()}
					<IconManage />
				{/snippet}
				{#snippet title()}
					<span class="text-sm font-normal">{$i18n.tokens.manage.text.title}</span>
				{/snippet}
			</LogoButton>
		</li>
	</ul>
{/snippet}

<Responsive up="sm">
	<Popover bind:visible anchor={button} invisibleBackdrop direction="rtl">
		{@render content()}
	</Popover>
</Responsive>
<Responsive down="sm">
	<BottomSheet {content} bind:visible />
</Responsive>
