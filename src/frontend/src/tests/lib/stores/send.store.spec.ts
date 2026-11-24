import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { initSendContext, type SendContext } from '$lib/stores/send.store';
import { get } from 'svelte/store';

describe('send.store', () => {
	// A destination tag routes funds to a sub-account at an exchange, so it must never be
	// inherited by a recipient the user changed to: that would credit the wrong beneficiary.
	describe('sendXrpDestinationTag', () => {
		const destinationA = 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD';
		const destinationB = 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe';

		let context: SendContext;

		beforeEach(() => {
			context = initSendContext({ token: XRP_TOKEN });
		});

		it('should be undefined initially', () => {
			expect(get(context.sendXrpDestinationTag)).toBeUndefined();
		});

		it('should keep the tag while the destination is unchanged', () => {
			context.sendDestination.set(destinationA);
			context.sendXrpDestinationTag.set(12_345);

			expect(get(context.sendXrpDestinationTag)).toBe(12_345);
		});

		// This is what the store exists for: surviving the WizardModal step re-render.
		it('should keep the tag across repeated reads', () => {
			context.sendDestination.set(destinationA);
			context.sendXrpDestinationTag.set(12_345);

			expect(get(context.sendXrpDestinationTag)).toBe(12_345);
			expect(get(context.sendXrpDestinationTag)).toBe(12_345);
		});

		it('should drop the tag when the destination changes', () => {
			context.sendDestination.set(destinationA);
			context.sendXrpDestinationTag.set(12_345);

			context.sendDestination.set(destinationB);

			expect(get(context.sendXrpDestinationTag)).toBeUndefined();
		});

		it('should drop the tag when the destination is cleared', () => {
			context.sendDestination.set(destinationA);
			context.sendXrpDestinationTag.set(12_345);

			context.sendDestination.set('');

			expect(get(context.sendXrpDestinationTag)).toBeUndefined();
		});

		// The tag must be discarded, not merely hidden: without touching the tag field for B, going
		// back to A must not resurrect A's tag.
		it('should not restore the tag when the original destination is re-entered', () => {
			context.sendDestination.set(destinationA);
			context.sendXrpDestinationTag.set(12_345);

			context.sendDestination.set(destinationB);
			context.sendDestination.set(destinationA);

			expect(get(context.sendXrpDestinationTag)).toBeUndefined();
		});

		it('should accept a new tag for the new destination', () => {
			context.sendDestination.set(destinationA);
			context.sendXrpDestinationTag.set(12_345);

			context.sendDestination.set(destinationB);
			context.sendXrpDestinationTag.set(67_890);

			expect(get(context.sendXrpDestinationTag)).toBe(67_890);
		});

		it('should treat an explicitly cleared tag as absent', () => {
			context.sendDestination.set(destinationA);
			context.sendXrpDestinationTag.set(12_345);
			context.sendXrpDestinationTag.set(undefined);

			expect(get(context.sendXrpDestinationTag)).toBeUndefined();
		});
	});
});
