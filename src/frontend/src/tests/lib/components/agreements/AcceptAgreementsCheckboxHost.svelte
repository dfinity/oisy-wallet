<script lang="ts">
	import AcceptAgreementsCheckbox from '$lib/components/agreements/AcceptAgreementsCheckbox.svelte';

	export let checked = false;
	export let inputId = 'agree';
	export let isOutdated = false;
	export let onChange: () => void = () => {};
</script>

<AcceptAgreementsCheckbox {checked} {inputId} {isOutdated} {onChange}>
	{#snippet agreementLink()}
		<a href="/agreements" data-tid="agreement-link">View agreement</a>
	{/snippet}
</AcceptAgreementsCheckbox>
