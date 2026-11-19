<script lang="ts">
	import CyclesMintModal from '$icp/components/cycles-mint/CyclesMintModal.svelte';
	import type { IcToken } from '$icp/types/ic-token';
	import ButtonHero from '$lib/components/hero/ButtonHero.svelte';
	import IconPickaxe from '$lib/components/icons/IconPickaxe.svelte';
	import { CYCLES_MINT_BUTTON } from '$lib/constants/test-ids.constants';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalCyclesMint } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		// The page's TCYCLES token.
		token: IcToken;
	}

	let { token }: Props = $props();

	const modalId = Symbol();
</script>

<!-- Not gated on the page's outflow state: that follows the TCYCLES balance, which would
	 lock minting for exactly the users who have none yet. The form handles an empty ICP
	 balance itself. -->
<ButtonHero
	ariaLabel={replacePlaceholders($i18n.cycles_mint.text.title, { $token: token.symbol })}
	disabled={$isBusy}
	onclick={() => modalStore.openCyclesMint(modalId)}
	testId={CYCLES_MINT_BUTTON}
>
	{#snippet icon()}
		<IconPickaxe size="24" />
	{/snippet}
	{#snippet label()}
		{$i18n.mint.text.mint}
	{/snippet}
</ButtonHero>

{#if $modalCyclesMint && $modalStore?.id === modalId}
	<CyclesMintModal destinationToken={token} />
{/if}
