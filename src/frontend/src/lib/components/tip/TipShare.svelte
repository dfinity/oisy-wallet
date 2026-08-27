<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { IcToken } from '$icp/types/ic-token';
	import SeasonalIconAstronautHelmet from '$lib/components/core/SeasonalIconAstronautHelmet.svelte';
	import IconClock from '$lib/components/icons/lucide/IconClock.svelte';
	import IconShareArrow from '$lib/components/icons/lucide/IconShareArrow.svelte';
	import ReceiveCopy from '$lib/components/receive/ReceiveCopy.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import QrCode from '$lib/components/ui/QrCode.svelte';
	import { TIP_SHARE_COPY_BUTTON } from '$lib/constants/test-ids.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { trackTip } from '$lib/services/tip-analytics.services';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { usdValue } from '$lib/utils/exchange.utils';
	import { formatCurrency, formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { canShare, shareText } from '$lib/utils/share.utils';

	interface Props {
		link: string;
		expiresAtNs: bigint;
		token: IcToken;
		amount: bigint;
		onDone: () => void;
		/**
		 * True when the recoverable copy of the claim code could not be stored. The
		 * tip is real and claimable either way; what is lost is the sender's ability
		 * to find this link again, so it has to be said while the link is still in
		 * front of them.
		 */
		linkNotSaved?: boolean;
	}

	let { link, expiresAtNs, token, amount, onDone, linkNotSaved = false }: Props = $props();

	// Copy and share are tracked separately: which one a sender reaches for says
	// whether the QR, the link or the share sheet is doing the work, and that is
	// the only way to know which of the three earns its place on this screen.
	const trackCopy = () => trackTip({ step: 'copy', side: 'sender', symbol: token.symbol });

	// The absolute instant, not "in 24 hours": the sender may share this link days
	// later, and a relative deadline stops being true the moment the modal closes.
	// "30 Aug, 15:30" rather than a full locale timestamp. The year and the seconds
	// were noise on a line whose only job is to tell the sender roughly how long
	// they have, and the long form crowded the one number that matters above it.
	let expiresAt = $derived(
		new Date(Number(expiresAtNs / 1_000_000n)).toLocaleString($currentLanguage, {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		})
	);

	// The reserved amount, not the text that was typed — this line is the sender's
	// only confirmation of what they actually committed.
	let amountLabel = $derived(
		`${formatToken({ value: amount, unitName: token.decimals, displayDecimals: token.decimals })} ${token.symbol}`
	);

	// Absent when no rate has loaded for this ledger, which is normal for a local
	// or newly listed token. The token amount is the fact; the fiat line is the
	// gloss, so it simply does not appear rather than showing a zero.
	let fiatLabel = $derived.by(() => {
		const exchangeRate = $exchanges?.[token.id]?.usd;

		if (isNullish(exchangeRate)) {
			return undefined;
		}

		return formatCurrency({
			value: usdValue({ decimals: token.decimals, balance: amount, exchangeRate }),
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage,
			notBelowThreshold: true
		});
	});
</script>

<ContentWithToolbar>
	<!--
		The amount leads, and large. This screen does two jobs at once: it is the
		sender's only receipt for what they committed, and it is the thing they hold
		up to whoever is about to claim it — so the sum, not the QR, is the subject.
	-->
	<div class="tip-amount mb-3 flex flex-col items-center rounded-2xl px-4 py-3 text-center">
		<span class="text-xs font-bold tracking-wider text-tertiary uppercase">
			{$i18n.tip.text.they_will_receive}
		</span>

		<!--
			The fiat value leads when we know it. "$0.50" is what the person being
			tipped actually understands; "0.5 ckUSDT" is the mechanism. The token line
			stays directly underneath, with the logo, so what is being sent is never in
			doubt — and it becomes the headline when no rate has loaded, which is normal
			for a local or newly listed token.
		-->
		{#if nonNullish(fiatLabel)}
			<span class="mt-1 text-3xl font-bold">{fiatLabel}</span>

			<span class="mt-1 flex items-center gap-2 text-sm text-secondary">
				<Logo alt={token.symbol} size="xs" src={token.icon} />

				{amountLabel}
			</span>
		{:else}
			<span class="mt-1 flex items-center gap-2">
				<Logo alt={token.symbol} size="xs" src={token.icon} />

				<span class="text-3xl font-bold">{amountLabel}</span>
			</span>

			<span class="mt-1 text-sm text-secondary">{token.name}</span>
		{/if}
	</div>

	<!--
		Bordered, not just white: in light theme the modal surface is white too, so
		without the outline the code floats instead of reading as something held up
		to be scanned.
	-->
	<div
		class="mx-auto mb-3 aspect-square h-48 max-h-[32vh] max-w-full rounded-2xl border border-secondary bg-white p-3"
	>
		<QrCode ariaLabel={$i18n.tip.text.share_heading} value={link}>
			{#snippet logo()}
				<div class="flex items-center justify-center rounded-full bg-white p-1">
					<SeasonalIconAstronautHelmet />
				</div>
			{/snippet}
		</QrCode>
	</div>

	<!--
		Not a `MessageBox`: that component is an icon beside left-aligned text, and
		this block is neither. Centred and quiet on purpose — it is reassurance, so
		it should be legible without competing with the amount above it.
	-->
	<div class="mb-3 rounded-xl bg-secondary px-4 py-3 text-center text-sm">
		<!--
			`m-0` on both, then one explicit step between them. A bare `<p>` carries an
			18px bottom margin in this app, which is more than this block's own padding
			— so the heading sat further from its own paragraph than the paragraph sat
			from the edge, and the whole box read bottom-heavy.
		-->
		<p class="m-0 font-bold">{$i18n.tip.text.no_wallet_needed_title}</p>

		<!--
			Two lines, not one sentence: the first answers "can they even claim this",
			the second says what to do with the code. `m-0` on the second so they read
			as one paragraph broken for scanning, rather than two separate blocks.
		-->
		<p class="m-0 mt-1 text-secondary">{$i18n.tip.text.no_wallet_needed}</p>

		<p class="m-0 text-secondary">{$i18n.tip.text.scan_or_photo}</p>
	</div>

	<!--
		Out of the box and on its own line: the deadline is the one fact on this
		screen that changes what the reader should do next, and inside the reassuring
		box it read as part of the reassurance.
	-->
	<div class="mb-3 flex items-center justify-center gap-2 text-sm text-secondary">
		<IconClock size="16" />

		{replacePlaceholders($i18n.tip.text.expires_at, { $date: expiresAt })}
	</div>

	<div class="flex items-center gap-2 rounded-lg bg-brand-subtle-10 px-3 py-2">
		<output class="min-w-0 flex-1 truncate text-sm">{link}</output>

		<ReceiveCopy
			address={link}
			copyAriaLabel={$i18n.tip.text.copy_link}
			onCopy={trackCopy}
			testId={TIP_SHARE_COPY_BUTTON}
		/>

		{#if canShare()}
			<ButtonIcon
				ariaLabel={$i18n.tip.text.share_link}
				link={false}
				onclick={async () => {
					trackTip({ step: 'share', side: 'sender', symbol: token.symbol });

					await shareText(link);
				}}
			>
				{#snippet icon()}
					<IconShareArrow size="24" />
				{/snippet}
			</ButtonIcon>
		{/if}
	</div>

	<!--
		Directly under the link, because it is about this link and it asks for
		something to be done right now. Warning rather than info: leaving this screen
		without copying loses the only copy there will ever be.
	-->
	{#if linkNotSaved}
		<MessageBox level="warning" styleClass="mt-3">{$i18n.tip.text.link_not_saved}</MessageBox>
	{/if}

	{#snippet toolbar()}
		<Button fullWidth onclick={onDone}>{$i18n.tip.text.done}</Button>
	{/snippet}
</ContentWithToolbar>

<style lang="scss">
	// Follows `FeatureCards`: a tinted brand layer over the surface, so the card
	// keeps its lift in both themes without hard-coding either one's colours.
	.tip-amount {
		background:
			linear-gradient(
				160deg,
				var(--color-background-brand-subtle-20),
				var(--color-background-brand-subtle-5)
			),
			var(--color-background-primary);
	}
</style>
