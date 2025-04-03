<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import IconManage from '$lib/components/icons/lucide/IconManage.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import TokensZeroBalanceToggle from '$lib/components/tokens/TokensZeroBalanceToggle.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import IconHide from '$lib/components/icons/IconHide.svelte';
	import { modalStore } from '$lib/stores/modal.store';

	let visible = false;
	let button: HTMLButtonElement | undefined;

	const toggleHideZeros = () => {
		document.dispatchEvent(new CustomEvent('toggleHideZeros'));
	};

	const openManageTokens = () => {
		modalStore.openManageTokens();
		visible = false;
	};
</script>

<ButtonIcon
	bind:button
	on:click={() => (visible = true)}
	ariaLabel={$i18n.navigation.alt.menu}
	disabled={$erc20UserTokensNotInitialized}
	link={false}
	colorStyle="muted"
	active={visible}
>
	<IconManage slot="icon" />
</ButtonIcon>

<Popover bind:visible anchor={button} invisibleBackdrop direction="rtl">
	<span class="mb-2 flex text-sm font-bold">{$i18n.tokens.manage.text.list_settings}</span>
	<ul class="flex flex-col">
		<li class="logo-button-list-item">
			<LogoButton dividers on:click={toggleHideZeros}>
				<IconHide slot="logo" />
				<span slot="title" class="text-sm font-normal">{$i18n.tokens.text.hide_zero_balances}</span>
				<TokensZeroBalanceToggle slot="action" />
			</LogoButton>
		</li>
		<li class="logo-button-list-item">
			<LogoButton dividers on:click={openManageTokens}>
				<IconManage slot="logo" />
				<span slot="title" class="text-sm font-normal">{$i18n.tokens.manage.text.title}</span>
			</LogoButton>
		</li>
	</ul>
</Popover>
