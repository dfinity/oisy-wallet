<script lang="ts">
	import networkBonusActive1 from '$lib/assets/rewards/network-bonus-active-1.svg';
	import networkBonusActive2 from '$lib/assets/rewards/network-bonus-active-2.svg';
	import networkBonusActive3 from '$lib/assets/rewards/network-bonus-active-3.svg';
	import networkBonusActive4 from '$lib/assets/rewards/network-bonus-active-4.svg';
	import networkBonusActive5 from '$lib/assets/rewards/network-bonus-active-5.svg';
	import networkBonusActive6 from '$lib/assets/rewards/network-bonus-active-6.svg';
	import networkBonusActive7 from '$lib/assets/rewards/network-bonus-active-7.svg';
	import networkBonusActive8 from '$lib/assets/rewards/network-bonus-active-8.svg';
	import networkBonusDisabled1 from '$lib/assets/rewards/network-bonus-disabled-1.svg';
	import networkBonusDisabled2 from '$lib/assets/rewards/network-bonus-disabled-2.svg';
	import networkBonusDisabled3 from '$lib/assets/rewards/network-bonus-disabled-3.svg';
	import networkBonusDisabled4 from '$lib/assets/rewards/network-bonus-disabled-4.svg';
	import networkBonusDisabled5 from '$lib/assets/rewards/network-bonus-disabled-5.svg';
	import networkBonusDisabled6 from '$lib/assets/rewards/network-bonus-disabled-6.svg';
	import networkBonusDisabled7 from '$lib/assets/rewards/network-bonus-disabled-7.svg';
	import networkBonusDisabled8 from '$lib/assets/rewards/network-bonus-disabled-8.svg';
	import Img from '$lib/components/ui/Img.svelte';
	import { REWARDS_NETWORK_MULTIPLIER_IMAGE } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		isEligible: boolean;
		multiplier: number;
	}

	let { isEligible, multiplier }: Props = $props();

	const networkBonusAssets = {
		1: { active: networkBonusActive1, disabled: networkBonusDisabled1 },
		2: { active: networkBonusActive2, disabled: networkBonusDisabled2 },
		3: { active: networkBonusActive3, disabled: networkBonusDisabled3 },
		4: { active: networkBonusActive4, disabled: networkBonusDisabled4 },
		5: { active: networkBonusActive5, disabled: networkBonusDisabled5 },
		6: { active: networkBonusActive6, disabled: networkBonusDisabled6 },
		7: { active: networkBonusActive7, disabled: networkBonusDisabled7 },
		8: { active: networkBonusActive8, disabled: networkBonusDisabled8 }
	};

	const networkBonusSource = $derived(
		isEligible
			? (networkBonusAssets[multiplier] ?? networkBonusAssets[1]).active
			: (networkBonusAssets[multiplier] ?? networkBonusAssets[1]).disabled
	);
</script>

<Img
	alt={$i18n.rewards.text.network_bonus}
	src={networkBonusSource}
	testId={REWARDS_NETWORK_MULTIPLIER_IMAGE}
/>