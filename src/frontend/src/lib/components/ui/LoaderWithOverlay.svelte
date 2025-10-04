<script lang="ts">
	import { Spinner } from '@dfinity/gix-components';

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
	<Spinner />
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
