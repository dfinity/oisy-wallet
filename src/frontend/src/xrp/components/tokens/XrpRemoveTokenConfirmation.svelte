<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { TOKEN_MODAL_DELETE_BUTTON } from '$lib/constants/test-ids.constants';
	import { xrpAddressMainnet } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { fade } from '$lib/utils/transitions.utils';
	import { XRP_OWNER_RESERVE_DROPS } from '$xrp/constants/xrp.constants';
	import {
		loadXrpRemoveTokenReview,
		type XrpRemoveTokenRefusal,
		type XrpRemoveTokenReview
	} from '$xrp/services/xrp-remove-token.services';
	import type { XrpBalance } from '$xrp/types/xrp-balance';
	import type { XrpTrustLineCustomToken } from '$xrp/types/xrp-trust-line-token';

	interface Props {
		token: XrpTrustLineCustomToken;
		loading?: boolean;
		onCancel: () => void;
		// The token cannot be removed now; the reason was already shown.
		onRefused: () => void;
		onConfirm: (fee: XrpBalance) => void;
	}

	let { token, loading = false, onCancel, onRefused, onConfirm }: Props = $props();

	let review = $state<XrpRemoveTokenReview | undefined>();

	const refusalMessage = (refusal: XrpRemoveTokenRefusal): string => {
		switch (refusal) {
			case 'transaction_in_flight':
				return $i18n.tokens.import.error.xrp_transaction_in_flight;
			case 'not_guarded':
				return $i18n.tokens.import.error.xrp_not_guarded;
			case 'not_held':
				return replacePlaceholders($i18n.tokens.import.error.xrp_remove_not_held, {
					$symbol: token.symbol
				});
			case 'balance_not_zero':
				return replacePlaceholders($i18n.tokens.import.error.xrp_remove_balance_not_zero, {
					$symbol: token.symbol
				});
			case 'insufficient_fee':
				return $i18n.tokens.import.error.xrp_insufficient_fee;
			case 'state_unavailable':
				return $i18n.tokens.import.error.xrp_state_unavailable;
		}
	};

	onMount(async () => {
		const { refusal, review: loaded } = await loadXrpRemoveTokenReview({
			identity: $authIdentity,
			token,
			address: $xrpAddressMainnet
		});

		if (nonNullish(refusal)) {
			toastsError({ msg: { text: refusalMessage(refusal) } });

			onRefused();
			return;
		}

		review = loaded;
	});
</script>

<ContentWithToolbar>
	<p class="my-5 px-5 text-center sm:px-0">
		{replacePlaceholders($i18n.tokens.import.text.xrp_remove_description, {
			$symbol: token.symbol
		})}
	</p>

	{#if nonNullish(review)}
		<div class="mb-4" in:fade>
			<FeeDisplay
				decimals={XRP_TOKEN.decimals}
				exchangeRate={$exchanges?.[XRP_TOKEN.id]?.usd}
				feeAmount={review.fee}
				symbol={XRP_TOKEN.symbol}
			>
				{#snippet label()}
					<span>{$i18n.fee.text.network_fee}</span>
				{/snippet}
			</FeeDisplay>

			<p class="mt-2 text-sm">
				{replacePlaceholders($i18n.tokens.import.text.xrp_remove_reserve, {
					$amount: formatToken({ value: XRP_OWNER_RESERVE_DROPS, unitName: XRP_TOKEN.decimals })
				})}
			</p>
		</div>
	{/if}

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonCancel disabled={loading} onclick={onCancel} />

			<Button
				colorStyle="error"
				disabled={loading || isNullish(review)}
				onclick={() => {
					if (nonNullish(review)) {
						onConfirm(review.fee);
					}
				}}
				testId={TOKEN_MODAL_DELETE_BUTTON}
			>
				{$i18n.core.text.delete}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
