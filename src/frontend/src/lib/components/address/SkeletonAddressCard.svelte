<script lang="ts">
	import AddressCard from '$lib/components/address/AddressCard.svelte';
	import SkeletonLogo from '$lib/components/ui/SkeletonLogo.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
</script>

<AddressCard>
	{#snippet logo()}
		<SkeletonLogo size="small" />
	{/snippet}
	{#snippet content()}
		<span class="mx-1 inline-block w-[120px] max-w-full items-center sm:w-[200px]"
			><SkeletonText /></span
		>
	{/snippet}
</AddressCard>
