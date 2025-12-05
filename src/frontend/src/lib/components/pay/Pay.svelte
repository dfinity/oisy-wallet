<script lang="ts">
	import IconPay from '$lib/components/icons/IconPay.svelte';
	import PayDialog from '$lib/components/pay/PayDialog.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { modalPayDialogOpen } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	const modalId = Symbol();
</script>

<ButtonIcon
	ariaLabel={$i18n.pay.alt.pay}
	colorStyle="tertiary-alt"
	link={false}
	onclick={() => modalStore.openPayDialog(modalId)}
	width="w-16"
>
	{#snippet icon()}
		<IconPay />
	{/snippet}
	{$i18n.pay.text.pay}
</ButtonIcon>

{#if $modalPayDialogOpen}
	<PayDialog />
{/if}
