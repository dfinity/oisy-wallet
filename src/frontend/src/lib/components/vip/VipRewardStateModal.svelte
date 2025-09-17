<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { GLDT_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
	import { icrcTokens } from '$icp/derived/icrc.derived';
	import { loadCustomTokens } from '$icp/services/icrc.services';
	import { setCustomToken } from '$icp-eth/services/custom-token.services';
	import failedVipReward from '$lib/assets/failed-vip-reward.svg';
	import successfulBinanceReward from '$lib/assets/successful-binance-reward.svg';
	import successfulClickBeeReward from '$lib/assets/successful-clickbee-reward.svg';
	import successfulVipReward from '$lib/assets/successful-vip-reward.svg';
	import Sprinkles from '$lib/components/sprinkles/Sprinkles.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import { VIP_STATE_BUTTON, VIP_STATE_IMAGE_BANNER } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledIcTokens } from '$lib/derived/tokens.derived';
	import { QrCodeType } from '$lib/enums/qr-code-types';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { autoLoadSingleToken } from '$lib/services/token.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		isSuccessful: boolean;
		codeType?: QrCodeType;
	}

	let { isSuccessful, codeType = QrCodeType.VIP }: Props = $props();

	const goldToken = $derived(
		$enabledIcTokens.find((token) => token.ledgerCanisterId === GLDT_LEDGER_CANISTER_ID)
	);

	const enableGldtToken = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		const token = $icrcTokens.find(
			({ ledgerCanisterId }) => ledgerCanisterId === GLDT_LEDGER_CANISTER_ID
		);

		await autoLoadSingleToken({
			token,
			identity: $authIdentity,
			setToken: setCustomToken,
			loadTokens: loadCustomTokens,
			errorMessage: $i18n.init.error.icrc_custom_token
		});
	};

	const close = async () => {
		if (codeType === QrCodeType.GOLD && isNullish(goldToken)) {
			await enableGldtToken();
		}

		modalStore.close();
	};
</script>

{#if isSuccessful}
	<Sprinkles />
{/if}

<Modal onClose={close}>
	{#snippet title()}
		<span class="text-xl"
			>{isSuccessful
				? $i18n.vip.reward.text.title_successful
				: $i18n.vip.reward.text.title_failed}</span
		>
	{/snippet}

	<ContentWithToolbar>
		<ImgBanner
			src={isSuccessful
				? codeType === QrCodeType.VIP
					? successfulVipReward
					: codeType === QrCodeType.GOLD
						? successfulBinanceReward
						: successfulClickBeeReward
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
				? codeType === QrCodeType.VIP
					? $i18n.vip.reward.text.reward_received_description
					: $i18n.vip.reward.text.brand_reward_received_description
				: $i18n.vip.reward.text.reward_failed_description}</span
		>

		{#snippet toolbar()}
			<Button
				colorStyle="secondary-light"
				fullWidth
				onclick={close}
				paddingSmall
				testId={VIP_STATE_BUTTON}
				type="button"
			>
				{isSuccessful ? $i18n.vip.reward.text.open_wallet : $i18n.vip.reward.text.open_wallet}
			</Button>
		{/snippet}
	</ContentWithToolbar>
</Modal>
