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
	import { TIP_HISTORY_CANCEL_BUTTON } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { cancelTip, loadMyTips } from '$lib/services/tip.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import {
		formatNanosecondsToDate,
		formatSecondsToNormalizedDate,
		formatToken
	} from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isTipCancellable, tipStatusKey, tipStatusTextClass } from '$lib/utils/tip-status.utils';
	import { tippableTokens } from '$lib/utils/tip.utils';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	let tips = $state<MyTip[]>([]);
	let loading = $state(true);
	let cancelling = $state<string | undefined>();

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

	let grouped = $derived.by(() => {
		const currentDate = new Date();

		return tips.reduce<Record<string, MyTip[]>>((acc, tip) => {
			const key = formatSecondsToNormalizedDate({
				seconds: Number(tip.created_at_ns / 1_000_000_000n),
				currentDate,
				language: $currentLanguage
			});

			return { ...acc, [key]: [...(acc[key] ?? []), tip] };
		}, {});
	});

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

	const handleCancel = async (tip: MyTip) => {
		if (isNullish($authIdentity)) {
			return;
		}

		cancelling = tip.tip_id;

		try {
			await cancelTip({
				identity: $authIdentity,
				tipId: tip.tip_id,
				ledgerCanisterId: tip.ledger_canister_id.toText()
			});
			toastsShow({ text: $i18n.tip.text.cancelled_toast, level: 'success' });
			await load();
		} catch (err: unknown) {
			toastsError({ msg: { text: $i18n.tip.text.cancel_failed }, err });
		} finally {
			cancelling = undefined;
		}
	};
</script>

<ContentWithToolbar>
	{#if !loading && tips.length === 0}
		<p class="py-12 text-center text-tertiary">{$i18n.tip.text.history_empty}</p>
	{/if}

	{#each Object.entries(grouped) as [dateLabel, group] (dateLabel)}
		<div class="mb-5 flex flex-col gap-3">
			<!--
				Capitalised in CSS rather than JS: the formatter returns a localised
				"today"/"yesterday" in lower case, and `TransactionsDateGroup` reaches
				into a *test* util to fix that. Not a dependency worth copying.

				`block`, not `flex`: text sitting directly in a flex container becomes an
				anonymous flex item, and `::first-letter` does not apply to those — which
				is why the heading still read "yesterday" on screen.
			-->
			<span class="block text-lg font-medium text-tertiary first-letter:uppercase">{dateLabel}</span
			>

			{#each group as tip (tip.tip_id)}
				{@const status = tipStatusKey(tip.status)}
				{@const token = tokenFor(tip)}
				{@const remaining = remainingLabel(tip)}
				{@const [claimer] = tip.claimed_by}

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
									$principal: claimer.toText()
								})}
							{:else if status === 'reserved' && nonNullish(remaining)}
								&nbsp;|&nbsp;{remaining}
							{/if}
						</span>
					{/snippet}

					{#snippet action()}
						{#if isTipCancellable(tip)}
							<Button
								colorStyle="secondary-light"
								disabled={cancelling === tip.tip_id}
								onclick={async () => await handleCancel(tip)}
								paddingSmall
								testId={TIP_HISTORY_CANCEL_BUTTON}
							>
								{$i18n.tip.text.cancel_tip}
							</Button>
						{/if}
					{/snippet}
				</Card>
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
