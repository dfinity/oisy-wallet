<script lang="ts">
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { ONESEC_BRIDGED_BALANCE_WARNING } from '$lib/constants/test-ids.constants';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { oneSecBridgedTokensWithBalance } from '$lib/derived/onesec-bridged-balances.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatList, replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	// Held in the component rather than delegated to `MessageBox`, so the warning stays
	// dismissed for the session even when the store re-emits and remounts the box.
	let dismissed = $state(false);

	// Network-qualified on purpose: a wrapped token carries the same symbol as the native one
	// it stands for, so a bare "ICP" would name the very token the user should hold instead.
	let tokenList = $derived(
		formatList({
			items: $oneSecBridgedTokensWithBalance.map(
				(token) => `${getTokenDisplaySymbol(token)} (${token.network.name})`
			),
			language: $currentLanguage
		})
	);
</script>

{#if !dismissed && $oneSecBridgedTokensWithBalance.length > 0}
	<MessageBox
		level="warning"
		onDismiss={() => (dismissed = true)}
		testId={ONESEC_BRIDGED_BALANCE_WARNING}
	>
		{replacePlaceholders($i18n.tokens.warning.onesec_bridged_balance, {
			$token_list: tokenList
		})}
	</MessageBox>
{/if}
