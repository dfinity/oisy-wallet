<script lang="ts">
	import { isNullish, nonNullish, secondsToDuration } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import type { MyTip } from '$declarations/backend/backend.did';
	import IconShareArrow from '$lib/components/icons/lucide/IconShareArrow.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';
	import { TIP_HISTORY_ROW_BUTTON } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { loadMyTips } from '$lib/services/tip.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import {
		formatNanosecondsToDate,
		formatToken,
		shortenWithMiddleEllipsis
	} from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import {
		isTipCancellable,
		TIP_HISTORY_GROUP_ORDER,
		tipHistoryGroup,
		tipStatusKey,
		tipStatusTextClass,
		type TipHistoryGroup
	} from '$lib/utils/tip-status.utils';
	import { tippableTokens } from '$lib/utils/tip.utils';

	interface Props {
		onClose: () => void;
		onOpenTip: (tip: MyTip) => void;
	}

	let { onClose, onOpenTip }: Props = $props();

	let tips = $state<MyTip[]>([]);
	let loading = $state(true);

	// The sender holds these tokens by definition — they reserved them — so their
	// own token list is a sound source for symbol and decimals here, unlike on the
	// recipient's side.
	const tokenFor = (tip: MyTip) =>
		tippableTokens($tokens).find(
			({ ledgerCanisterId }) => ledgerCanisterId === tip.ledger_canister_id.toText()
		);

	// Unsigned: the amount is part of the row's title now ("Tip 10 SOL"), where a
	// minus would read as a negative tip rather than as money leaving. The status
	// on the right already says whether it moved.
	const amountLabel = (tip: MyTip): string => {
		const token = tokenFor(tip);

		return nonNullish(token)
			? `${formatToken({ value: tip.amount, unitName: token.decimals, displayDecimals: token.decimals })} ${token.symbol}`
			: `${tip.amount}`;
	};

	// Second line of a live row: how long is left, not the absolute instant. The
	// share screen carries the absolute one, where the sender is about to hand the
	// link over; here the useful question is whether there is still time to cancel.
	const remainingLabel = (tip: MyTip): string | undefined => {
		const remainingMs = Number(tip.expires_at_ns / 1_000_000n) - Date.now();

		if (remainingMs <= 0) {
			return undefined;
		}

		return replacePlaceholders($i18n.tip.text.expires_in, {
			$duration: secondsToDuration({
				seconds: BigInt(Math.floor(remainingMs / 1000)),
				i18n: $i18n.temporal.seconds_to_duration
			})
		});
	};

	/**
	 * Grouped by what the row needs from the reader, not by when it was created.
	 *
	 * Dates made a poor top-level split here: a sender scanning this screen wants
	 * to know whether anything is stuck, and a date heading buries a failed tip
	 * among yesterday's successful ones. Each row still carries its own date.
	 *
	 * Order comes from `TIP_HISTORY_GROUP_ORDER` rather than object key order, and
	 * within a group the newest tip is first — `get_my_tips` already returns them
	 * that way, so the reduce preserves it.
	 */
	let grouped = $derived.by(() =>
		TIP_HISTORY_GROUP_ORDER.map((group) => ({
			group,
			tips: tips.filter((tip) => tipHistoryGroup(tipStatusKey(tip.status)) === group)
		})).filter(({ tips: groupTips }) => groupTips.length > 0)
	);

	const groupHeading = (group: TipHistoryGroup): string =>
		({
			failed: $i18n.tip.text.group_failed,
			open: $i18n.tip.text.group_open,
			claimed: $i18n.tip.text.group_claimed,
			expired: $i18n.tip.text.group_expired
		})[group];

	const load = async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		try {
			tips = await loadMyTips({ identity: $authIdentity });
		} catch (err: unknown) {
			toastsError({ msg: { text: $i18n.tip.text.claim_failed }, err });
		} finally {
			loading = false;
		}
	};

	onMount(load);

	// The whole row opens the tip. That only became possible once Cancel moved off
	// the row: a button inside a button is invalid markup, and it left the reader
	// guessing which of two outcomes a click would pick when one of them is
	// irreversible.
	//
	// It hands the tip straight over rather than recovering the link first. The
	// recovery derives a vetKey, which can take seconds, and holding the row until
	// it finished made a click look like it had missed. The screen it opens knows
	// how to wait.
</script>

<ContentWithToolbar>
	<!--
		`SkeletonCards` rather than a centred spinner: it is what every other list in
		the app shows while loading, and it reserves the rows' height so the content
		does not jump into place underneath the reader's cursor.
	-->
	{#if loading}
		<SkeletonCards rows={3} testIdPrefix="tip-history" />
	{:else if tips.length === 0}
		<!-- `m-0`: the 18px a bare `<p>` carries would sit under an otherwise
		     symmetrically padded empty state. -->
		<p class="m-0 py-12 text-center text-tertiary">{$i18n.tip.text.history_empty}</p>
	{/if}

	{#each grouped as { group, tips: groupTips } (group)}
		<div class="mb-5 flex flex-col gap-3">
			<span class="block text-lg font-medium text-tertiary">{groupHeading(group)}</span>

			<!--
				One line of explanation, only on the group that asks something of the
				reader. "Failed" alone invites the wrong conclusion — that the money went
				somewhere or the link is dead — when in fact nothing moved and the same
				link still works.
			-->
			{#if group === 'failed'}
				<p class="m-0 text-sm text-tertiary">{$i18n.tip.text.group_failed_hint}</p>
			{/if}

			{#each groupTips as tip (tip.tip_id)}
				{@const status = tipStatusKey(tip.status)}
				{@const token = tokenFor(tip)}
				{@const remaining = remainingLabel(tip)}
				{@const [claimer] = tip.claimed_by}

				{#if isTipCancellable(tip)}
					<button
						class="contents"
						data-tid={TIP_HISTORY_ROW_BUTTON}
						onclick={() => onOpenTip(tip)}
						type="button"
					>
						<span class="block w-full rounded-xl px-2 py-2 text-left hover:bg-brand-subtle-10">
							<Card noMargin>
								{#snippet icon()}
									<div class="relative shrink-0">
										<Logo alt={token?.symbol ?? ''} size="md" src={token?.icon} />

										<span class="absolute -right-1 -bottom-1">
											<RoundedIcon icon={IconShareArrow} paddingClass="p-1" size="12" />
										</span>
									</div>
								{/snippet}

								<!--
						`flex-1` so the status is pushed to the far right. `Card` renders the
						title and the amount as siblings in one flex row with no spacer
						between them, and a bare text title does not grow — which put the
						status hard against the amount instead of across the row.
					-->
								<span class="min-w-0 flex-1 truncate">
									{replacePlaceholders($i18n.tip.text.tip_amount, { $amount: amountLabel(tip) })}
								</span>

								{#snippet amount()}
									<span class={tipStatusTextClass(status)}>
										{$i18n.tip.text[`status_${status}`]}
									</span>
								{/snippet}

								{#snippet description()}
									<span class="truncate text-sm">
										{formatNanosecondsToDate({
											nanoseconds: tip.created_at_ns,
											language: $currentLanguage
										})}

										<!--
											Shortened rather than left to `truncate`: a principal is 63 characters
											and the row already carries a date, so CSS clipping cut it at whatever
											width happened to be left — mid-segment, with no ending at all. The
											middle ellipsis keeps the first and last groups, which is the part
											anyone actually compares.
										-->
										{#if status === 'claimed' && nonNullish(claimer)}
											&nbsp;|&nbsp;{replacePlaceholders($i18n.tip.text.claimed_by, {
												$principal: shortenWithMiddleEllipsis({ text: claimer.toText() })
											})}
										{:else if status === 'reserved' && nonNullish(remaining)}
											&nbsp;|&nbsp;{remaining}
										{/if}
									</span>
								{/snippet}
							</Card>
						</span>
					</button>
				{:else}
					<!-- Nothing to open: a finished tip has no live link, so the row must
					     not offer a click that would do nothing. -->
					<div class="px-2 py-2">
						<Card noMargin>
							{#snippet icon()}
								<div class="relative shrink-0">
									<Logo alt={token?.symbol ?? ''} size="md" src={token?.icon} />

									<span class="absolute -right-1 -bottom-1">
										<RoundedIcon icon={IconShareArrow} paddingClass="p-1" size="12" />
									</span>
								</div>
							{/snippet}

							<!--
						`flex-1` so the status is pushed to the far right. `Card` renders the
						title and the amount as siblings in one flex row with no spacer
						between them, and a bare text title does not grow — which put the
						status hard against the amount instead of across the row.
					-->
							<span class="min-w-0 flex-1 truncate">
								{replacePlaceholders($i18n.tip.text.tip_amount, { $amount: amountLabel(tip) })}
							</span>

							{#snippet amount()}
								<span class={tipStatusTextClass(status)}>
									{$i18n.tip.text[`status_${status}`]}
								</span>
							{/snippet}

							{#snippet description()}
								<span class="truncate text-sm">
									{formatNanosecondsToDate({
										nanoseconds: tip.created_at_ns,
										language: $currentLanguage
									})}

									{#if status === 'claimed' && nonNullish(claimer)}
										&nbsp;|&nbsp;{replacePlaceholders($i18n.tip.text.claimed_by, {
											$principal: shortenWithMiddleEllipsis({ text: claimer.toText() })
										})}
									{:else if status === 'reserved' && nonNullish(remaining)}
										&nbsp;|&nbsp;{remaining}
									{/if}
								</span>
							{/snippet}
						</Card>
					</div>
				{/if}
			{/each}
		</div>
	{/each}

	{#snippet toolbar()}
		<!--
			"Close", not "Cancel". Every live row already carries a Cancel that
			revokes a reservation, and the drawn design puts a second Cancel in the
			footer that only dismisses the screen. Two buttons with one word and two
			very different consequences, one of them irreversible.
		-->
		<Button colorStyle="secondary-light" fullWidth onclick={onClose}>
			{$i18n.core.text.close}
		</Button>
	{/snippet}
</ContentWithToolbar>
