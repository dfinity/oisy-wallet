<script lang="ts">
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import IconHide from '$lib/components/icons/IconHide.svelte';
	import IconManage from '$lib/components/icons/lucide/IconManage.svelte';
	import TokensZeroBalanceToggle from '$lib/components/tokens/TokensZeroBalanceToggle.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import NotificationBlob from '$lib/components/ui/NotificationBlob.svelte';
	import ResponsivePopover from '$lib/components/ui/ResponsivePopover.svelte';
	import { hideZeroBalances } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { emit } from '$lib/utils/events.utils';

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
	ariaLabel={$i18n.navigation.alt.menu}
	colorStyle="muted"
	disabled={$erc20UserTokensNotInitialized}
	link={false}
	onclick={() => (visible = true)}
	styleClass={visible ? 'active' : ''}
	bind:button
>
	{#snippet icon()}
		<NotificationBlob display={$hideZeroBalances} position="top-right">
			<IconManage />
		</NotificationBlob>
	{/snippet}
</ButtonIcon>

<ResponsivePopover {button} bind:visible>
	{#snippet content()}
		<span class="mb-2 flex text-sm font-bold">{$i18n.tokens.manage.text.list_settings}</span>
		<List condensed noPadding>
			<ListItem>
				<LogoButton fullWidth onClick={toggleHideZeros}>
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
			</ListItem>
			<ListItem>
				<LogoButton fullWidth onClick={openManageTokens}>
					{#snippet logo()}
						<IconManage />
					{/snippet}
					{#snippet title()}
						<span class="text-sm font-normal">{$i18n.tokens.manage.text.title}</span>
					{/snippet}
				</LogoButton>
			</ListItem>
		</List>
	{/snippet}
</ResponsivePopover>
