<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { IcToken } from '$icp/types/ic-token';
	import SeasonalIconAstronautHelmet from '$lib/components/core/SeasonalIconAstronautHelmet.svelte';
	import IconShareArrow from '$lib/components/icons/lucide/IconShareArrow.svelte';
	import ReceiveCopy from '$lib/components/receive/ReceiveCopy.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import QrCode from '$lib/components/ui/QrCode.svelte';
	import {
		TIP_HISTORY_CANCEL_BUTTON,
		TIP_SHARE_COPY_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { canShare, shareText } from '$lib/utils/share.utils';

	interface Props {
		/**
		 * Absent while a link recovered from History is still being decrypted. The
		 * screen opens the moment the row is clicked — vetKD derivation takes long
		 * enough that waiting for it before transitioning read as a dead click — so
		 * everything the row already knew is drawn immediately and only the link
		 * arrives late.
		 */
		link?: string;
		/** Shown where the link would be when there is not going to be one. */
		linkMessage?: string;
		expiresAtNs: bigint;
		token: IcToken;
		amount: bigint;
		onDone: () => void;
		/** Present when this screen is a live tip reopened from History. */
		onCancel?: () => void;
		cancelling?: boolean;
	}

	let {
		link,
		linkMessage,
		expiresAtNs,
		token,
		amount,
		onDone,
		onCancel,
		cancelling = false
	}: Props = $props();

	// The absolute instant, not "in 24 hours": the sender may share this link days
	// later, and a relative deadline stops being true the moment the modal closes.
	let expiresAt = $derived(new Date(Number(expiresAtNs / 1_000_000n)).toLocaleString());

	// The reserved amount, not the text that was typed — this line is the sender's
	// only confirmation of what they actually committed.
	let amountLabel = $derived(
		`${formatToken({ value: amount, unitName: token.decimals, displayDecimals: token.decimals })} ${token.symbol}`
	);
</script>

<ContentWithToolbar>
	<div class="mb-3 flex items-center justify-center gap-2">
		<Logo alt={token.symbol} size="xs" src={token.icon} />

		<span class="text-xl font-bold">{amountLabel}</span>
	</div>

	{#if nonNullish(link)}
		<div class="mx-auto mb-4 aspect-square h-64 max-h-[40vh] max-w-full rounded-xl bg-white p-4">
			<QrCode ariaLabel={$i18n.tip.text.share_heading} value={link}>
				{#snippet logo()}
					<div class="flex items-center justify-center rounded-full bg-white p-1">
						<SeasonalIconAstronautHelmet />
					</div>
				{/snippet}
			</QrCode>
		</div>
	{:else if isNullish(linkMessage)}
		<!-- Same box, so nothing below it moves when the real code lands in it. -->
		<div
			class="mx-auto mb-4 aspect-square h-64 max-h-[40vh] max-w-full animate-pulse rounded-xl bg-disabled-alt"
			aria-hidden="true"
		></div>
	{/if}

	<MessageBox level="info" styleClass="mb-4">
		<p>{$i18n.tip.text.no_wallet_needed}</p>

		<p class="font-bold">
			{replacePlaceholders($i18n.tip.text.expires_at, { $date: expiresAt })}
		</p>
	</MessageBox>

	{#if nonNullish(link)}
		<div class="flex items-center gap-2 rounded-lg bg-brand-subtle-10 px-3 py-2">
			<output class="min-w-0 flex-1 truncate text-sm">{link}</output>

			<ReceiveCopy
				address={link}
				copyAriaLabel={$i18n.tip.text.copy_link}
				testId={TIP_SHARE_COPY_BUTTON}
			/>

			{#if canShare()}
				<ButtonIcon
					ariaLabel={$i18n.tip.text.share_link}
					link={false}
					onclick={async () => await shareText(link)}
				>
					{#snippet icon()}
						<IconShareArrow size="24" />
					{/snippet}
				</ButtonIcon>
			{/if}
		</div>
	{:else if nonNullish(linkMessage)}
		<!--
			The rest of the screen still earns its place without a link: this is the
			one place the sender can see what a tip is worth, when it lapses, and
			cancel it.
		-->
		<MessageBox level="warning">{linkMessage}</MessageBox>
	{:else}
		<div class="flex items-center gap-2 rounded-lg bg-brand-subtle-10 px-3 py-2">
			<span class="h-5 w-full animate-pulse rounded bg-disabled-alt" aria-hidden="true"></span>
		</div>
	{/if}

	{#if nonNullish(onCancel)}
		<Button
			colorStyle="secondary-light"
			disabled={cancelling}
			fullWidth
			onclick={onCancel}
			styleClass="mt-4"
			testId={TIP_HISTORY_CANCEL_BUTTON}
		>
			{$i18n.tip.text.cancel_tip}
		</Button>
	{/if}

	{#snippet toolbar()}
		<!--
			"Back" when the tip was opened from History, because that is all this
			button does — the footer is for leaving the screen. Cancelling lives in the
			content above, next to the link it revokes, so the two are not adjacent
			buttons a reader has to tell apart.
		-->
		<Button disabled={cancelling} fullWidth onclick={onDone}>
			{nonNullish(onCancel) ? $i18n.core.text.back : $i18n.tip.text.done}
		</Button>
	{/snippet}
</ContentWithToolbar>
