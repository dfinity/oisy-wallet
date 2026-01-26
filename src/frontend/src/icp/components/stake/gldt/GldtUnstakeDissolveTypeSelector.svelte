<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import GldtUnstakeDelayedDissolveTerms from '$icp/components/stake/gldt/GldtUnstakeDelayedDissolveTerms.svelte';
	import GldtUnstakeDissolveValue from '$icp/components/stake/gldt/GldtUnstakeDissolveValue.svelte';
	import GldtUnstakeImmediateDissolveTerms from '$icp/components/stake/gldt/GldtUnstakeImmediateDissolveTerms.svelte';
	import { GLDT_STAKE_CONTEXT_KEY, type GldtStakeContext } from '$icp/stores/gldt-stake.store';
	import type { IcToken } from '$icp/types/ic-token';
	import Hr from '$lib/components/ui/Hr.svelte';
	import RadioBox from '$lib/components/ui/RadioBox.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';
	import { formatTokenBigintToNumber } from '$lib/utils/format.utils';

	interface Props {
		dissolveInstantly: boolean;
		amountToReceive?: number;
		amount: OptionAmount;
	}

	let { dissolveInstantly = $bindable(), amountToReceive = $bindable(), amount }: Props = $props();

	const { store: gldtStakeStore } = getContext<GldtStakeContext>(GLDT_STAKE_CONTEXT_KEY);

	const { sendToken, sendTokenDecimals } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let tokenFee = $derived(
		formatTokenBigintToNumber({
			value: ($sendToken as IcToken).fee,
			displayDecimals: $sendTokenDecimals,
			unitName: $sendTokenDecimals
		})
	);

	let instantDissolveFee = $derived(
		nonNullish(amount) && nonNullish($gldtStakeStore?.config?.early_unlock_fee)
			? Number(
					(Number(amount) * $gldtStakeStore.config.early_unlock_fee).toFixed($sendTokenDecimals)
				)
			: 0
	);

	let delayedDissolveAmount = $derived(
		nonNullish(amount)
			? Number(Math.max(Number(amount) - tokenFee, 0).toFixed($sendTokenDecimals))
			: 0
	);

	let immediateDissolveAmount = $derived(
		nonNullish(amount)
			? Number(
					Math.max(Number(amount) - instantDissolveFee - tokenFee, 0).toFixed($sendTokenDecimals)
				)
			: 0
	);

	$effect(() => {
		amountToReceive = dissolveInstantly ? immediateDissolveAmount : delayedDissolveAmount;
	});
</script>

<div class="w-full">
	<RadioBox
		checked={!dissolveInstantly}
		onChange={() => (dissolveInstantly = false)}
		styleClass="mb-4"
	>
		{#snippet label()}
			<GldtUnstakeDissolveValue
				amount={delayedDissolveAmount}
				isTitle
				label={$i18n.stake.text.delayed_dissolve}
			/>
		{/snippet}

		{#snippet description()}
			<GldtUnstakeDissolveValue amount={tokenFee} label={$i18n.stake.text.included_token_fee} />

			<Hr spacing="md" />

			<GldtUnstakeDelayedDissolveTerms />
		{/snippet}
	</RadioBox>

	<RadioBox checked={dissolveInstantly} onChange={() => (dissolveInstantly = true)}>
		{#snippet label()}
			<GldtUnstakeDissolveValue
				amount={immediateDissolveAmount}
				isTitle
				label={$i18n.stake.text.immediate_dissolve}
			/>
		{/snippet}

		{#snippet description()}
			<GldtUnstakeDissolveValue
				amount={instantDissolveFee}
				label={$i18n.stake.text.included_dissolve_fee}
			/>

			<GldtUnstakeDissolveValue
				amount={tokenFee}
				label={$i18n.stake.text.included_token_fee}
				styleClass="mt-2"
			/>

			<Hr spacing="md" />

			<GldtUnstakeImmediateDissolveTerms />
		{/snippet}
	</RadioBox>
</div>
