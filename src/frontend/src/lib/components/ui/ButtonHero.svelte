<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';

	export let disabled = false;
	export let testId: string | undefined = undefined;
	export let ariaLabel: string;
</script>

<Button on:click {ariaLabel} {disabled} {testId} colorStyle="tertiary" link paddingSmall>
	<div class="flex flex-col items-center justify-center gap-2 md:flex-row">
		<slot name="icon" />
		<div class="min-w-12 max-w-[72px] text-xs md:text-base">
			<slot />
		</div>
	</div>
</Button>
