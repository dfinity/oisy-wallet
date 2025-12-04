<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import CoverPayDialog from '$lib/assets/cover-pay-dialog.png';
	import IconScanLine from '$lib/components/icons/IconScanLine.svelte';
	import PayDialogContent from '$lib/components/pay/PayDialogContent.svelte';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { modalPayDialogOpen } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	let open = $state($modalPayDialogOpen);

	const close = () => {
		modalStore.close();

		open = false;
	};

	const modalId = Symbol();

	const openScanner = () => {
		open = false;

		modalStore.openUniversalScanner(modalId);
	};
</script>

{#snippet banner()}
	<ImgBanner
		alt={$i18n.pay.text.dialog_title}
		src={CoverPayDialog}
		styleClass="max-h-56 rounded-lg"
	/>
{/snippet}

{#snippet footer()}
	<Button fullWidth onclick={openScanner}>
		<div class="flex flex-row items-center gap-2">
			<IconScanLine />
			{replaceOisyPlaceholders($i18n.pay.text.dialog_button)}
		</div>
	</Button>
{/snippet}

<Responsive up="md">
	<Modal onClose={close}>
		{#snippet title()}
			<div class="flex items-center gap-3 font-bold text-primary">
				{replaceOisyPlaceholders($i18n.pay.text.dialog_title)}
			</div>
		{/snippet}

		<ContentWithToolbar toolbar={footer}>
			{@render banner()}

			<div class="mt-5 flex flex-col gap-6">
				<PayDialogContent />
			</div>
		</ContentWithToolbar>
	</Modal>
</Responsive>

<Responsive down="sm">
	<BottomSheet {footer} bind:visible={open}>
		{#snippet content()}
			{@render banner()}

			<h5 class="w-full py-3">{replaceOisyPlaceholders($i18n.pay.text.dialog_title)}</h5>

			<PayDialogContent />
		{/snippet}
	</BottomSheet>
</Responsive>
