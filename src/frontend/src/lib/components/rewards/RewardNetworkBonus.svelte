<script lang="ts">
	import networkBonusActive1 from '$lib/assets/rewards/network-bonus-active-1.svg';
	import networkBonusDisabled1 from '$lib/assets/rewards/network-bonus-disabled-1.svg';
	import Img from '$lib/components/ui/Img.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		isEligible: boolean;
	}

	let { isEligible }: Props = $props();

	const networkBonusSource = $derived(isEligible ? networkBonusActive1 : networkBonusDisabled1);
</script>

<Img alt={$i18n.rewards.text.network_bonus} src={networkBonusSource} />
