<script lang="ts">
	import { Modal, QRCode } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import IconAstronautHelmet from '$lib/components/icons/IconAstronautHelmet.svelte';
	import ReceiveCopy from '$lib/components/receive/ReceiveCopy.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { VIP_CODE_REGENERATE_INTERVAL_IN_SECONDS } from '$lib/constants/app.constants';
	import {
		VIP_CODE_REGENERATE_BUTTON,
		VIP_QR_CODE_COPY_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { getNewReward } from '$lib/services/reward-code.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	let counter = VIP_CODE_REGENERATE_INTERVAL_IN_SECONDS;
	let countdown: NodeJS.Timeout | undefined;
	const maxRetriesToGetRewardCode = 3;
	let retriesToGetRewardCode = 0;

	let code: string;
	const generateCode = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		const vipReward = await getNewReward($authIdentity);
		if (nonNullish(vipReward)) {
			code = vipReward.code;
		} else {
			retriesToGetRewardCode++;
		}
	};

	const regenerateCode = async () => {
		clearInterval(countdown);

		if (retriesToGetRewardCode >= maxRetriesToGetRewardCode) {
			return;
		}

		await generateCode();
		counter = VIP_CODE_REGENERATE_INTERVAL_IN_SECONDS;
		countdown = setInterval(intervalFunction, 1000);
	};

	const intervalFunction = async () => {
		counter--;

		if (counter === 0) {
			await regenerateCode();
		}
	};

	const onVisibilityChange = () => {
		if (document.hidden) {
			clearInterval(countdown);
		} else {
			countdown = setInterval(intervalFunction, 1000);
		}
	};

	onMount(regenerateCode);
	onDestroy(() => clearInterval(countdown));

	let qrCodeUrl;
	$: qrCodeUrl = `${window.location.origin}/?code=${code}`;
</script>

<svelte:window on:visibilitychange={onVisibilityChange} />

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title"
		><span class="text-xl">{$i18n.vip.invitation.text.title}</span>
	</svelte:fragment>

	<ContentWithToolbar>
		<div class="mx-auto mb-4 aspect-square h-80 max-h-[44vh] max-w-full p-4">
			{#if nonNullish(code)}
				<QRCode value={qrCodeUrl}>
					<div slot="logo" class="flex items-center justify-center rounded-lg bg-white p-2">
						<IconAstronautHelmet />
					</div>
				</QRCode>
			{/if}
		</div>

		{#if nonNullish(code)}
			<div class="flex items-center justify-between gap-4 rounded-lg bg-brand-subtle px-3 py-2">
				<output class="break-all">{qrCodeUrl}</output>
				<ReceiveCopy
					address={qrCodeUrl}
					copyAriaLabel={$i18n.vip.invitation.text.invitation_link_copied}
					testId={VIP_QR_CODE_COPY_BUTTON}
				/>
			</div>

			<span class="mb-4 block w-full pt-3 text-center text-sm text-tertiary">
				{#if 0 >= counter}
					<span class="animate-pulse">{$i18n.vip.invitation.text.generating_new_code}</span>
				{:else}
					{replacePlaceholders($i18n.vip.invitation.text.regenerate_countdown_text, {
						$counter: counter.toString()
					})}
				{/if}
			</span>
		{:else}
			<span class="w-full"><SkeletonText /></span>
		{/if}

		<ButtonGroup slot="toolbar">
			<ButtonCloseModal />
			<Button
				paddingSmall
				colorStyle="primary"
				type="button"
				fullWidth
				on:click={regenerateCode}
				testId={VIP_CODE_REGENERATE_BUTTON}
			>
				{$i18n.vip.invitation.text.generate_new_link}
			</Button>
		</ButtonGroup>
	</ContentWithToolbar>
</Modal>
