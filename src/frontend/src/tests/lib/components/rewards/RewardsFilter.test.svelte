<script lang="ts">
    import RewardsFilter from "$lib/components/rewards/RewardsFilter.svelte";

    export let rewardState
</script>

<RewardsFilter bind:rewardState={$rewardState} />