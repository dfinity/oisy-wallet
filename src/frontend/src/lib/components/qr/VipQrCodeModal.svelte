<script lang="ts">
	import { Modal, QRCode } from '@dfinity/gix-components';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import IconAstronautHelmet from '$lib/components/icons/IconAstronautHelmet.svelte';
	import { nonNullish } from '@dfinity/utils';

	let code;
	$: code = '02vn3uCMKZG' // TODO generate Code

	let oisyCodeBaseUrl = 'https://oisy.com/?code=';

	let qrCodeUrl;
	$: qrCodeUrl = `${oisyCodeBaseUrl}${code}`;

	$: console.log(qrCodeUrl)

</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title"
		><span class="text-xl">{replaceOisyPlaceholders($i18n.vip.qr.text.title)}</span>
	</svelte:fragment>

	<ContentWithToolbar>

		<div class="mx-auto aspect-square h-80 max-h-[44vh] max-w-[100%] px-4 pb-4">
			{#if nonNullish(code)}
				<QRCode value={qrCodeUrl}>
					<svelte:fragment slot="logo">
						<div class="flex items-center justify-center rounded-lg bg-white p-2">
							<IconAstronautHelmet />
						</div>
					</svelte:fragment>
				</QRCode>
			{/if}
		</div>

		<ButtonCloseModal slot="toolbar" />
	</ContentWithToolbar>
</Modal>