<script lang="ts">
	import networkBonusActive1 from '$lib/assets/rewards/network-bonus-active-1.svg';
	import Img from '$lib/components/ui/Img.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<Img alt={$i18n.rewards.text.network_bonus} src={networkBonusActive1} />