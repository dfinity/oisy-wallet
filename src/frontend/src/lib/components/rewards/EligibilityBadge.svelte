<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconCircle from '$lib/components/icons/lucide/IconCircle.svelte';
	import IconCircleCheck from '$lib/components/icons/lucide/IconCircleCheck.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		testId?: string;
		isEligible?: boolean;
	}

	let { testId, isEligible = false }: Props = $props();
</script>

<span class="inline-flex">
	<Badge
		styleClass="rounded-full py-1 pl-2 pr-3"
		testId={nonNullish(testId) ? `${testId}-badge` : undefined}
		variant={isEligible ? 'eligible' : 'not-eligible'}
	>
		{#if isEligible}
			<div class="flex items-center gap-1.5 text-sm">
				<IconCircleCheck size="14" />
				{$i18n.rewards.text.youre_eligible}
			</div>
		{:else}
			<div class="flex items-center gap-1.5 text-sm">
				<IconCircle size="14" />
				{$i18n.rewards.text.not_eligible}
			</div>
		{/if}
	</Badge>
</span>