<script lang="ts">
	import { IconCheckCircleFill } from '@dfinity/gix-components';
	import type { AirdropDescription } from '$env/types/env-airdrop';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	export let loading = true;
	export let airdrop: AirdropDescription;
	export let badgeOnly = false;
	export let isEligible = false;
	export let requirementsFulfilled: boolean[];
</script>

{#if airdrop.requirements.length > 0}
	{#if badgeOnly}
		{#if isEligible}<span class="inline-flex pl-3"
				><Badge variant="success">{$i18n.airdrops.text.youre_eligible}</Badge></span
			>{/if}
	{:else}
		<Hr spacing="md" />

		<span class="text-md font-semibold"
			>{$i18n.airdrops.text.requirements_title}
		</span>{#if isEligible}<span class="inline-flex pl-3"
				><Badge variant="success">{$i18n.airdrops.text.youre_eligible}</Badge></span
			>{/if}
		<ul class="list-none">
			{#each airdrop.requirements as requirement, i}
				<li class="flex gap-2 pt-1">
					{#if requirementsFulfilled[i]}
						<span class="flex w-full flex-row">
							<span class="-mt-0.5 mr-2 text-success-primary"
								><IconCheckCircleFill size={32} /></span
							>
							<span>
								{requirement}
							</span>
						</span>
					{:else}
						<span
							class="flex w-full flex-row"
							class:transition={loading}
							class:duration-500={loading}
							class:ease-in-out={loading}
							class:animate-pulse={loading}
						>
							<span class="-mt-0.5 mr-2 text-disabled"><IconCheckCircleFill size={32} /></span>
							<span>
								{requirement}
							</span>
						</span>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
{/if}
