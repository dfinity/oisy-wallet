<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import IconManage from '$lib/components/icons/lucide/IconManage.svelte';
	import ManageTokensMenuButton from '$lib/components/manage/ManageTokensMenuButton.svelte';
	import TokensZeroBalance from '$lib/components/tokens/TokensZeroBalance.svelte';
	import TokensZeroBalanceCheckbox from '$lib/components/tokens/TokensZeroBalanceCheckbox.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	let visible = false;
	let button: HTMLButtonElement | undefined;
</script>

<div class="hidden sm:block">
	<TokensZeroBalanceCheckbox />
</div>

<div class="block sm:hidden">
	<ButtonIcon
		bind:button
		on:click={() => (visible = true)}
		ariaLabel={$i18n.navigation.alt.menu}
		disabled={$erc20UserTokensNotInitialized}
		link={false}
	>
		<IconManage slot="icon" />
	</ButtonIcon>

	<Popover bind:visible anchor={button} invisibleBackdrop direction="rtl">
		<div class="gap-3 flex flex-col">
			<TokensZeroBalance />

			<Hr />

			<ManageTokensMenuButton on:icCloseMenu={() => (visible = false)} />
		</div>
	</Popover>
</div>
