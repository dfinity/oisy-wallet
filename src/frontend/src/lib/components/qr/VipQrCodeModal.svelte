<script lang="ts">
	import { Modal, QRCode } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import IconAstronautHelmet from '$lib/components/icons/IconAstronautHelmet.svelte';
	import ReceiveCopy from '$lib/components/receive/ReceiveCopy.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	function generateRandomString() {
		// TODO remove this function
		var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
		var result = '';
		for (var i = 0; i < 11; i++) {
			result += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return result;
	}

	const secondsToRegenerate = 45;
	let counter = secondsToRegenerate;
	let countdown;

	let code;
	const generateCode = () => {
		code = generateRandomString(); // TODO load Code from backend
	};

	const regenerateCode = () => {
		clearInterval(countdown);
		generateCode();
		counter = secondsToRegenerate;
		countdown = setInterval(intervalFunction, 1000);
	};

	const intervalFunction = () => {
		counter--;

		if (counter === 0) {
			regenerateCode();
		}
	};

	onMount(() => {
		countdown = setInterval(intervalFunction, 1000);
	});

	generateCode();

	let oisyCodeBaseUrl = 'https://oisy.com/?code=';

	let qrCodeUrl;
	$: qrCodeUrl = `${oisyCodeBaseUrl}${code}`;
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title"
		><span class="text-xl">{$i18n.vip.invitation.text.title}</span>
	</svelte:fragment>

	<ContentWithToolbar>
		<div class="mx-auto mb-4 aspect-square h-80 max-h-[44vh] max-w-[100%] p-4">
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

		{#if nonNullish(code)}
			<div class="flex items-center justify-between gap-4 rounded-lg bg-brand-subtle px-3 py-2">
				<output>{qrCodeUrl}</output>
				<ReceiveCopy
					address={qrCodeUrl}
					copyAriaLabel={$i18n.vip.invitation.text.invitation_link_copied}
				/>
			</div>

			<span class="mb-4 block w-full pt-3 text-center text-sm text-tertiary">
				{replacePlaceholders($i18n.vip.invitation.text.regenerate_countdown_text, {
					$counter: counter
				})}
			</span>
		{:else}
			<span class="w-full"><SkeletonText /></span>
		{/if}

		<ButtonGroup styleClass="flex-col sm:flex-row" slot="toolbar">
			<ButtonCloseModal />
			<Button paddingSmall colorStyle="primary" type="button" fullWidth on:click={regenerateCode}>
				{$i18n.vip.invitation.text.generate_new_link}
			</Button>
		</ButtonGroup>
	</ContentWithToolbar>
</Modal>
