<script lang="ts">
	import AgreementsGuard from '$lib/components/guard/AgreementsGuard.svelte';
	import RewardGuard from '$lib/components/guard/RewardGuard.svelte';
	import ShortcutGuard from '$lib/components/guard/ShortcutGuard.svelte';
	import UrlGuard from '$lib/components/guard/UrlGuard.svelte';
</script>

<AgreementsGuard />

<UrlGuard />

<ShortcutGuard />

<RewardGuard />
