<script lang="ts">
	import { onMount } from 'svelte';
	import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
	import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
	import Modal from '$lib/components/ui/Modal.svelte';
	import WalletConnectModalTitle from '$lib/components/wallet-connect/WalletConnectModalTitle.svelte';
	import { balancesStore } from '$lib/stores/balances.store';
	import { exchangeStore } from '$lib/stores/exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import SolWalletConnectSignReview from '$sol/components/wallet-connect/SolWalletConnectSignReview.svelte';
	import { splDefaultTokensStore } from '$sol/stores/spl-default-tokens.store';
	import { MOCK_TRANSACTIONS, MOCK_USER_ADDRESS } from '$sol/types/sol-instructions-view.mock';

	// index.html paints a spinner that the root layout only removes once auth resolves, which never
	// happens on a route that signs nobody in. Without this the study sits behind it.
	onMount(() => document.querySelector('body > #app-spinner')?.remove());

	let selected = $state(0);

	let tx = $derived(MOCK_TRANSACTIONS[selected]);

	// The review reads these to price and name what it shows, so they are seeded the way the app
	// itself seeds them by the time a WalletConnect request arrives. Without the SPL defaults every
	// mint would render as an address, including the ones OISY does know.
	splDefaultTokensStore.set(SPL_TOKENS);
	balancesStore.set({ id: SOLANA_TOKEN.id, data: { data: 2_500_000_000n, certified: false } });
	exchangeStore.set([{ solana: { usd: 187.42 } }]);
</script>

<div class="relative z-20 flex flex-wrap gap-2 bg-primary p-4">
	{#each MOCK_TRANSACTIONS as t, i (i)}
		<button
			class="rounded-lg px-3 py-2 text-sm font-medium"
			class:bg-brand-subtle-20={selected === i}
			class:bg-secondary={selected !== i}
			onclick={() => (selected = i)}
		>
			{t.title}
		</button>
	{/each}

	<span class="w-full text-sm text-tertiary">
		Signer {MOCK_USER_ADDRESS} · signature {tx.signature}
	</span>
</div>

{#key selected}
	<Modal onClose={() => undefined}>
		{#snippet title()}
			<WalletConnectModalTitle>
				{$i18n.wallet_connect.text.sign_transaction}
			</WalletConnectModalTitle>
		{/snippet}

		<SolWalletConnectSignReview
			application={tx.dapp}
			destination={tx.destination}
			feeToken={SOLANA_TOKEN}
			instructions={tx.rows}
			instructionsShown={tx.shownCount}
			instructionsTotal={tx.rawCount}
			onApprove={() => undefined}
			onReject={() => undefined}
			preview={tx.preview}
			prioritizationFee={tx.prioritizationFee}
			prioritizationFeeEstimate={1_120_000n}
			source={MOCK_USER_ADDRESS}
			token={SOLANA_TOKEN}
		/>
	</Modal>
{/key}
