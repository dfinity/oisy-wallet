<script lang="ts">
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import SkeletonLogo from '$lib/components/ui/SkeletonLogo.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';

	interface Props {
		testId?: string;
	}

	let { testId }: Props = $props();
</script>

<div class="flex w-full flex-col">
	<LogoButton hover={false} testId={testId}>
		{#snippet logo()}
			<span class="mr-2 flex">
				<SkeletonLogo />
			</span>
		{/snippet}

		{#snippet title()}
			<span class="inline-block w-[120px] max-w-full sm:w-[200px]">
				<SkeletonText />
			</span>
		{/snippet}

		{#snippet description()}
			<span class="inline-block w-[80px] max-w-full">
				<SkeletonText />
			</span>
		{/snippet}

		{#snippet titleEnd()}
			<span class="inline-block w-[100px] max-w-full">
				<SkeletonText />
			</span>
		{/snippet}

		{#snippet descriptionEnd()}
			<span class="inline-block w-[80px] max-w-full">
				<SkeletonText />
			</span>
		{/snippet}
	</LogoButton>
</div>
