<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import type { MyTip } from '$declarations/backend/backend.did';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { TIP_HISTORY_CANCEL_BUTTON } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { cancelTip, loadMyTips } from '$lib/services/tip.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isTipCancellable, tipStatusKey, tipStatusVariant } from '$lib/utils/tip-status.utils';
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

	const amountLabel = (tip: MyTip): string => {
		const token = tokenFor(tip);

		return nonNullish(token)
			? `${formatToken({ value: tip.amount, unitName: token.decimals, displayDecimals: token.decimals })} ${token.symbol}`
			: `${tip.amount}`;
	};

	const dateLabel = (ns: bigint): string => new Date(Number(ns / 1_000_000n)).toLocaleString();

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

	<ul class="list-none p-0">
		{#each tips as tip (tip.tip_id)}
			{@const status = tipStatusKey(tip.status)}

			<li class="flex items-center justify-between gap-3 border-b border-secondary py-3">
				<div class="min-w-0">
					<p class="font-bold">{amountLabel(tip)}</p>

					{#if status === 'claimed' && nonNullish(tip.claimed_by[0])}
						<p class="truncate text-sm text-tertiary">
							{replacePlaceholders($i18n.tip.text.claimed_by, {
								$principal: tip.claimed_by[0].toText()
							})}
						</p>
					{:else if status === 'reserved'}
						<p class="text-sm text-tertiary">
							{replacePlaceholders($i18n.tip.text.expires_in_short, {
								$date: dateLabel(tip.expires_at_ns)
							})}
						</p>
					{/if}
				</div>

				<div class="flex shrink-0 items-center gap-2">
					<Badge variant={tipStatusVariant(status)} width="w-fit">
						{$i18n.tip.text[`status_${status}`]}
					</Badge>

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
				</div>
			</li>
		{/each}
	</ul>

	{#snippet toolbar()}
		<ButtonCancel fullWidth onclick={onClose} />
	{/snippet}
</ContentWithToolbar>
