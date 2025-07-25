<script lang="ts">
	interface Props {
		testId?: string;
		ariaLabel?: string;
		styleClass?: string;
	}

	const { testId, ariaLabel, styleClass }: Props = $props();
</script>

<div
	class={`avatar-spinner-overlay ${styleClass ?? ''}`}
	role="status"
	data-tid={testId}
	aria-label={ariaLabel}
>
	<svg
		id="app-spinner"
		preserveAspectRatio="xMidYMid meet"
		focusable="false"
		aria-hidden="true"
		data-tid="spinner"
		viewBox="0 0 100 100"
	>
		<circle cx="50%" cy="50%" r="45" />
	</svg>
</div>
