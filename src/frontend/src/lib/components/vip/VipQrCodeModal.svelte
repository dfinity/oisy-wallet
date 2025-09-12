<script lang="ts">
	import { Modal, QRCode } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import IconAstronautHelmet from '$lib/components/icons/IconAstronautHelmet.svelte';
	import IconBinanceYellow from '$lib/components/icons/IconBinanceYellow.svelte';
	import ReceiveCopy from '$lib/components/receive/ReceiveCopy.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { CODE_REGENERATE_INTERVAL_IN_SECONDS } from '$lib/constants/app.constants';
	import {
		VIP_CODE_REGENERATE_BUTTON,
		VIP_QR_CODE_BINANCE_ICON,
		VIP_QR_CODE_COPY_BUTTON,
		VIP_QR_CODE_ICON
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { QrCodeType } from '$lib/enums/qr-code-types';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { getNewReward } from '$lib/services/reward.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		codeType?: QrCodeType;
	}

	let { codeType = QrCodeType.VIP }: Props = $props();

	let counter = $state(CODE_REGENERATE_INTERVAL_IN_SECONDS);
	let countdown: NodeJS.Timeout | undefined = $state();
	const maxRetriesToGetRewardCode = 3;
	let retriesToGetRewardCode = $state(0);

	let code: string | undefined = $state();
	const generateCode = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		const vipReward = await getNewReward({ campaignId: codeType, identity: $authIdentity });
		if (nonNullish(vipReward)) {
			({ code } = vipReward);
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
		counter = CODE_REGENERATE_INTERVAL_IN_SECONDS;
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

	const qrCodeUrl = $derived(`${window.location.origin}/?code=${code}`);
</script>

<svelte:window on:visibilitychange={onVisibilityChange} />

<Modal onClose={modalStore.close}>
	{#snippet title()}
		<span class="text-xl"
			>{codeType === QrCodeType.VIP
				? $i18n.vip.invitation.text.title
				: $i18n.vip.invitation.text.binance_title}</span
		>
	{/snippet}

	<ContentWithToolbar>
		<div class="mx-auto mb-8 aspect-square h-80 max-h-[44vh] max-w-full rounded-xl bg-white p-4">
			{#if nonNullish(code)}
				<QRCode value={qrCodeUrl}>
					<div slot="logo" class="flex items-center justify-center rounded-full bg-primary p-2">
						{#if codeType === QrCodeType.VIP}
							<IconAstronautHelmet testId={VIP_QR_CODE_ICON} />
						{:else}
							<IconBinanceYellow size="44" testId={VIP_QR_CODE_BINANCE_ICON} />
						{/if}
					</div>
				</QRCode>
			{/if}
		</div>

		{#if nonNullish(code)}
			<div class="flex items-center justify-between gap-4 rounded-lg bg-brand-subtle-20 px-3 py-2">
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

		{#snippet toolbar()}
			<ButtonGroup>
				<ButtonCloseModal />
				<Button
					colorStyle="primary"
					fullWidth
					onclick={regenerateCode}
					paddingSmall
					testId={VIP_CODE_REGENERATE_BUTTON}
					type="button"
				>
					{$i18n.vip.invitation.text.generate_new_link}
				</Button>
			</ButtonGroup>
		{/snippet}
	</ContentWithToolbar>
</Modal>
