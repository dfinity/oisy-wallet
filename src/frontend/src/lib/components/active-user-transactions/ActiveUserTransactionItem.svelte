<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
	import Divider from '$lib/components/common/Divider.svelte';
	import IconCkConvert from '$lib/components/icons/IconCkConvert.svelte';
	import IconAlertTriangle from '$lib/components/icons/lucide/IconAlertTriangle.svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { lendBorrowProvidersConfig } from '$lib/config/lend-borrow.config';
	import { swapProvidersDetails } from '$lib/constants/swap.constants';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { LendBorrowProvider } from '$lib/types/lend-borrow';
	import { LIQUIDIUM_EXTERNAL_REF_KEYS } from '$lib/types/liquidium-active-tx';
	import { ONESEC_EXTERNAL_REF_KEYS } from '$lib/types/onesec-swap';
	import { SwapProvider } from '$lib/types/swap';
	import { formatNanosecondsToShortRelativeTime } from '$lib/utils/format.utils';
	import {
		isLiquidiumActiveUserTransaction,
		liquidiumActionKey,
		toLiquidiumExternalRefsMap
	} from '$lib/utils/liquidium-active-tx.utils';
	import {
		isOneSecActiveUserTransaction,
		toOneSecExternalRefsMap
	} from '$lib/utils/onesec-swap.utils';

	interface Props {
		tx: ActiveUserTransaction;
		isUnseen: boolean;
		dismissing: boolean;
		onDismiss: () => void;
	}

	let { tx, isUnseen, dismissing, onDismiss }: Props = $props();

	const isOneSec = $derived(isOneSecActiveUserTransaction(tx));
	const isLiquidium = $derived(isLiquidiumActiveUserTransaction(tx));
	const refs = $derived(toOneSecExternalRefsMap(tx.external_refs));
	const liquidiumRefs = $derived(toLiquidiumExternalRefsMap(tx.external_refs));

	const isFailed = $derived('Failed' in tx.status);
	const isSucceeded = $derived('Succeeded' in tx.status);

	const statusCircleClass = $derived(
		isFailed
			? 'bg-error-subtle-20 text-error-primary'
			: isSucceeded
				? 'bg-success-subtle-20 text-success-primary'
				: 'bg-brand-subtle-20 text-brand-primary'
	);

	const liquidiumActionLabel = $derived(
		'Liquidium' in tx.data
			? {
					supply: $i18n.liquidium.text.action_supply,
					borrow: $i18n.liquidium.text.action_borrow,
					repay: $i18n.liquidium.text.action_repay,
					withdraw: $i18n.liquidium.text.action_withdraw
				}[liquidiumActionKey(tx.data.Liquidium.action)]
			: undefined
	);

	const providerName = $derived(
		isLiquidium
			? lendBorrowProvidersConfig[LendBorrowProvider.LIQUIDIUM].name
			: isOneSec
				? (swapProvidersDetails[SwapProvider.ONE_SEC]?.name ?? '')
				: undefined
	);

	const titleText = $derived(
		isLiquidium
			? [
					liquidiumActionLabel,
					liquidiumRefs[LIQUIDIUM_EXTERNAL_REF_KEYS.AMOUNT],
					liquidiumRefs[LIQUIDIUM_EXTERNAL_REF_KEYS.ASSET_SYMBOL]
				]
					.filter(nonNullish)
					.join(' ')
			: [
					isOneSec ? $i18n.swap.text.swap : undefined,
					refs[ONESEC_EXTERNAL_REF_KEYS.AMOUNT],
					refs[ONESEC_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL],
					'→',
					refs[ONESEC_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL]
				]
					.filter(nonNullish)
					.join(' ')
	);

	const sourceNetwork = $derived(refs[ONESEC_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL] ?? '');
	const destinationNetwork = $derived(
		refs[ONESEC_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL] ?? ''
	);

	const createdAgo = $derived(
		formatNanosecondsToShortRelativeTime({
			nanoseconds: tx.created_at_ns,
			language: $currentLanguage
		})
	);

	const handleDismissClick = (e: MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		onDismiss();
	};
</script>

{#snippet closeAction()}
	<ButtonIcon
		ariaLabel={$i18n.active_user_transactions.text.dismiss_aria_label}
		colorStyle="tertiary-alt"
		disabled={dismissing}
		height="h-6"
		onclick={handleDismissClick}
		styleClass="text-tertiary"
		width="w-6"
	>
		{#snippet icon()}
			<IconClose />
		{/snippet}
	</ButtonIcon>
{/snippet}

<li class="mb-2 last:mb-0">
	<LogoButton
		action={isFailed || isSucceeded ? closeAction : undefined}
		condensed
		fullWidth
		hover={false}
		subtitleStyleClass="text-xs"
		titleStyleClass="text-sm"
	>
		{#snippet logo()}
			<div class="relative mr-1">
				<div class={`flex h-10 w-10 items-center justify-center rounded-full ${statusCircleClass}`}>
					{#if isFailed}
						<IconAlertTriangle size="20" />
					{:else}
						<IconCkConvert size="20" />
					{/if}
				</div>

				{#if isUnseen}
					<span class="absolute top-0 left-0 h-2 w-2 rounded-full bg-brand-primary"></span>
				{/if}
			</div>
		{/snippet}

		{#snippet title()}
			{titleText}
		{/snippet}

		{#snippet description()}
			{#if isLiquidium}
				{providerName}
			{:else}
				{sourceNetwork} → {destinationNetwork}{#if nonNullish(providerName)}<Divider
					/>{providerName}{/if}
			{/if}
		{/snippet}

		{#snippet descriptionEnd()}
			<div class="ml-2">
				{createdAgo}
			</div>
		{/snippet}
	</LogoButton>
</li>
