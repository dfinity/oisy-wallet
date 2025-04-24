<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { GLDT_SYMBOL } from '$env/tokens/tokens.icrc.env';
	import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
	import failedVipReward from '$lib/assets/failed-vip-reward.svg';
	import successfulBinanceReward from '$lib/assets/successful-binance-reward.svg';
	import successfulVipReward from '$lib/assets/successful-vip-reward.svg';
	import Sprinkles from '$lib/components/sprinkles/Sprinkles.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import { VIP_STATE_BUTTON, VIP_STATE_IMAGE_BANNER } from '$lib/constants/test-ids.constants';
	import { enabledIcTokens } from '$lib/derived/tokens.derived';
	import { QrCodeType } from '$lib/enums/qr-code-types';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	export let isSuccessful: boolean;
	export let codeType: QrCodeType = QrCodeType.VIP;

	let goldToken: IcTokenToggleable | undefined;
	$: goldToken = $enabledIcTokens.find((token) => token.symbol === GLDT_SYMBOL);
</script>

{#if isSuccessful}
	<Sprinkles />
{/if}

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">
		<span class="text-xl"
			>{isSuccessful
				? $i18n.vip.reward.text.title_successful
				: $i18n.vip.reward.text.title_failed}</span
		>
	</svelte:fragment>

	<ContentWithToolbar>
		<ImgBanner
			src={isSuccessful
				? codeType === QrCodeType.VIP
					? successfulVipReward
					: successfulBinanceReward
				: failedVipReward}
			styleClass="aspect-auto"
			testId={VIP_STATE_IMAGE_BANNER}
		/>

		<h3 class="my-3 text-center"
			>{isSuccessful
				? replaceOisyPlaceholders($i18n.vip.reward.text.reward_received)
				: $i18n.vip.reward.text.reward_failed}</h3
		>
		<span class="block w-full text-center"
			>{isSuccessful
				? $i18n.vip.reward.text.reward_received_description
				: $i18n.vip.reward.text.reward_failed_description}</span
		>

		<Button
			paddingSmall
			colorStyle="secondary-light"
			type="button"
			fullWidth
			on:click={() => {
				codeType === QrCodeType.GOLD && isNullish(goldToken)
					? modalStore.openManageTokens({
							initialSearch: GLDT_SYMBOL,
							message: replaceOisyPlaceholders($i18n.tokens.manage.text.default_message)
						})
					: modalStore.close();
			}}
			testId={VIP_STATE_BUTTON}
			slot="toolbar"
		>
			{isSuccessful ? $i18n.vip.reward.text.open_wallet : $i18n.vip.reward.text.open_wallet}
		</Button>
	</ContentWithToolbar>
</Modal>
