<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
	import Divider from '$lib/components/common/Divider.svelte';
	import IconCkConvert from '$lib/components/icons/IconCkConvert.svelte';
	import IconAlertTriangle from '$lib/components/icons/lucide/IconAlertTriangle.svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { swapProvidersDetails } from '$lib/constants/swap.constants';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { ONESEC_EXTERNAL_REF_KEYS } from '$lib/types/onesec-swap';
	import { SwapProvider } from '$lib/types/swap';
	import { formatNanosecondsToShortRelativeTime } from '$lib/utils/format.utils';
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
	const refs = $derived(toOneSecExternalRefsMap(tx.external_refs));

	const isFailed = $derived('Failed' in tx.status);
	const isSucceeded = $derived('Succeeded' in tx.status);

	const statusCircleClass = $derived(
		isFailed
			? 'bg-error-subtle-20 text-error-primary'
			: isSucceeded
				? 'bg-success-subtle-20 text-success-primary'
				: 'bg-brand-subtle-20 text-brand-primary'
	);

	const providerName = $derived(
		isOneSec ? (swapProvidersDetails[SwapProvider.ONE_SEC]?.name ?? '') : undefined
	);

	const titleText = $derived(
		[
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
					<span class="bg-brand-primary absolute top-0 left-0 h-2 w-2 rounded-full"></span>
				{/if}
			</div>
		{/snippet}

		{#snippet title()}
			{titleText}
		{/snippet}

		{#snippet description()}
			{sourceNetwork} → {destinationNetwork}{#if nonNullish(providerName)}<Divider
				/>{providerName}{/if}
		{/snippet}

		{#snippet descriptionEnd()}
			<div class="ml-2">
				{createdAgo}
			</div>
		{/snippet}
	</LogoButton>
</li>
