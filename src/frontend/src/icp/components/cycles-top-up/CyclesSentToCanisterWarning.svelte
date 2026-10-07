<script lang="ts">
	import { slide } from 'svelte/transition';
	import { CYCLES_TOP_UP_ENABLED } from '$env/cycles-top-up.env';
	import { isTokenCyclesLedger } from '$icp/utils/cycles-mint.utils';
	import { isCanisterAccount } from '$icp/utils/cycles-top-up.utils';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { CYCLES_SENT_TO_CANISTER_WARNING } from '$lib/constants/test-ids.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		destination: string;
		token: Token;
		styleClass?: string;
	}

	let { destination, token, styleClass }: Props = $props();

	// TCYCLES sent to a canister land in its account on the cycles ledger: they are not
	// cycles in the canister until its own code withdraws them. Not blocking, since a
	// canister can own TCYCLES on purpose.
	let show = $derived(isTokenCyclesLedger(token) && isCanisterAccount(destination));
</script>

{#if show}
	<div
		class={styleClass}
		data-tid={CYCLES_SENT_TO_CANISTER_WARNING}
		role="alert"
		transition:slide={SLIDE_DURATION}
	>
		<MessageBox level="warning">
			{replacePlaceholders($i18n.cycles_top_up.text.sent_to_canister, { $token: token.symbol })}
			<!-- Without the flag there is no Top up to point to. -->
			{#if CYCLES_TOP_UP_ENABLED}
				{replacePlaceholders($i18n.cycles_top_up.text.sent_to_canister_top_up, {
					$token: token.symbol
				})}
			{/if}
		</MessageBox>
	</div>
{/if}
