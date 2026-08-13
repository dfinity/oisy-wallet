<script lang="ts">
	import LoaderSpinner from '$lib/components/ui/LoaderSpinner.svelte';

	interface Props {
		testId?: string;
		ariaLabel?: string;
		styleClass?: string;
	}

	const { testId, ariaLabel, styleClass }: Props = $props();
</script>

<div
	class={`avatar-spinner-overlay ${styleClass ?? ''}`}
	aria-label={ariaLabel}
	data-tid={testId}
	role="status"
>
	<LoaderSpinner />
</div>

<style lang="scss">
	.avatar-spinner-overlay {
		inset: 0;
		background-color: color-mix(in srgb, var(--color-base-white) 40%, transparent);
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>
