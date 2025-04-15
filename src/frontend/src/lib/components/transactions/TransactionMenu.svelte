<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import IconKebabMenu from '$lib/components/icons/IconKebabMenu.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import HiddenTransactionsModal from '$lib/components/transactions/HiddenTransactionsModal.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import ButtonMenu from '$lib/components/ui/ButtonMenu.svelte';
	import { modalHiddenTransactions } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	let visible = false;
	let button: HTMLButtonElement | undefined;

	const showPopover = () => (visible = true);
	const hidePopover = () => (visible = false);
</script>

<ButtonIcon
	colorStyle="muted"
	link={false}
	styleClass="p-0"
	bind:button
	on:click={showPopover}
	ariaLabel={$i18n.transactions.alt.transactions_menu}
>
	<IconKebabMenu size="32" slot="icon" />
</ButtonIcon>

<Popover invisibleBackdrop bind:visible direction="rtl" on:click={hidePopover} anchor={button}>
	<ButtonMenu
		on:click={modalStore.openHiddenTransactions}
		ariaLabel={$i18n.transactions.alt.show_hidden_transactions_menu_item}
	>
		<IconEyeOff />
		{$i18n.transactions.text.show_hidden_transactions}
	</ButtonMenu>
</Popover>

{#if $modalHiddenTransactions}
	<HiddenTransactionsModal />
{/if}
