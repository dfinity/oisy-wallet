<script lang="ts">
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
</script>

<StakeContentSection>
	{#snippet title()}
		test
	{/snippet}
	{#snippet content()}
		test
	{/snippet}
</StakeContentSection>
