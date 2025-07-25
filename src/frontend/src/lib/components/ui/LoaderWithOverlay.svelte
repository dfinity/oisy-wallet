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
	role="status"
	data-tid={testId}
	aria-label={ariaLabel}
>
	<Spinner />
</div>
