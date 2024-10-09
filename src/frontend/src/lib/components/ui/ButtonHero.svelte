<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';

	export let disabled = false;
	export let testId: string | undefined = undefined;
	export let ariaLabel: string;
</script>

<Button on:click {ariaLabel} {disabled} {testId} colorStyle="tertiary" shrinkOnSmallScreens>
	<slot name="icon" />
	<div class="max-w-[72px]">
		<slot />
	</div>
</Button>
