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
	import {
		TRANSACTION_MENU,
		TRANSACTION_MENU_HIDDEN_TRANSACTIONS,
		TRANSACTION_MENU_POPOVER
	} from "$lib/constants/test-ids.constants";

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
	testId={TRANSACTION_MENU}
>
	<IconKebabMenu size="32" slot="icon" />
</ButtonIcon>

<Popover invisibleBackdrop bind:visible direction="rtl" on:click={hidePopover} anchor={button} testId={TRANSACTION_MENU_POPOVER}>
	<ButtonMenu
		on:click={modalStore.openHiddenTransactions}
		ariaLabel={$i18n.transactions.alt.show_hidden_transactions_menu_item}
		testId={TRANSACTION_MENU_HIDDEN_TRANSACTIONS}
	>
		<IconEyeOff />
		{$i18n.transactions.text.show_hidden_transactions}
	</ButtonMenu>
</Popover>

{#if $modalHiddenTransactions}
	<HiddenTransactionsModal />
{/if}
