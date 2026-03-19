<script lang="ts">
	import AgreementsGuard from '$lib/components/guard/AgreementsGuard.svelte';
	import RewardGuard from '$lib/components/guard/RewardGuard.svelte';
	import ShortcutGuard from '$lib/components/guard/ShortcutGuard.svelte';
	import TipClaimGuard from '$lib/components/guard/TipClaimGuard.svelte';
	import UrlGuard from '$lib/components/guard/UrlGuard.svelte';
</script>

<AgreementsGuard />

<UrlGuard />

<TipClaimGuard />

<ShortcutGuard />

<RewardGuard />
