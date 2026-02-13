<script lang="ts">
	import { getContext } from 'svelte';
	import { GLDT_STAKE_CONTEXT_KEY, type GldtStakeContext } from '$icp/stores/gldt-stake.store';
	import IconBan from '$lib/components/icons/lucide/IconBan.svelte';
	import IconClock from '$lib/components/icons/lucide/IconClock.svelte';
	import { SECONDS_IN_DAY } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		isReview?: boolean;
	}

	let { isReview = false }: Props = $props();

	const { sendTokenSymbol } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const { store: gldtStakeStore } = getContext<GldtStakeContext>(GLDT_STAKE_CONTEXT_KEY);

	let dissolveDelayInDays = $derived(
		Math.floor(Number($gldtStakeStore?.position?.dissolve_delay.secs ?? 0) / SECONDS_IN_DAY)
	);
</script>

<span class="mb-2 flex w-full text-xs">
	<IconClock />

	<span class="ml-2 flex w-full flex-col">
		{#if isReview}
			<span class="mb-1 font-bold">
				{$i18n.stake.text.delayed_dissolve}
			</span>
		{/if}

		<span class="text-tertiary">
			{replacePlaceholders($i18n.stake.text.delayed_dissolve_terms, {
				$token: $sendTokenSymbol,
				$delay: `${dissolveDelayInDays}`
			})}
		</span>
	</span>
</span>

<span class="flex w-full text-xs">
	<IconBan />

	<span class="ml-2 w-full" class:font-bold={isReview} class:text-tertiary={!isReview}>
		{replacePlaceholders($i18n.stake.text.delayed_dissolve_info, {
			$token: $sendTokenSymbol
		})}
	</span>
</span>
