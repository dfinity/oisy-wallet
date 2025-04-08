<script lang="ts">
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';

	export let onBack: () => void;
	export let onDone: () => void;
</script>

<ContentWithToolbar>
	<div>
		<p>
			<span class="text-lg font-bold">Thanks for your feedback!</span>
		</p>
		<p>
			Here are some helpful resources about <span class="font-bold">security</span> and
			<span class="font-bold">privacy</span> in OISY and Internet Identity. We hope they help you make
			an informed decision:
		</p>
		<p>
			<ExternalLink styleClass="font-semibold flex flex-row-reverse" ariaLabel="" href="">
				OISY Introduction
			</ExternalLink>
		</p>
		<p>
			<ExternalLink styleClass="font-semibold flex flex-row-reverse" ariaLabel="" href="">
				OISY docs: Internet Identity
			</ExternalLink>
		</p>
		<p>
			<ExternalLink styleClass="font-semibold flex flex-row-reverse" ariaLabel="" href="">
				Who controls the private key for the native assets?
			</ExternalLink>
		</p>
		<p class="mb-0">
			<ExternalLink styleClass="font-semibold flex flex-row-reverse" ariaLabel="" href="">
				Asset Control, Recovery, and Governance in OISY Wallet
			</ExternalLink>
		</p>
	</div>

	<ButtonGroup slot="toolbar">
		<ButtonBack on:click={onBack} />
		<ButtonDone on:click={onDone} />
	</ButtonGroup>
</ContentWithToolbar>
