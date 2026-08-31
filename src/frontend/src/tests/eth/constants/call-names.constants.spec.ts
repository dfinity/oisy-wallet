import { ETH_CALL_NAMES } from '$eth/constants/call-names.constants';
import { MULTICALL_ARGUMENTS } from '$eth/constants/multicall.constants';
import { classifyWalletConnectEthCall } from '$eth/utils/wallet-connect.utils';

// A name beside a call tells the user OISY knows what it is. It may only say so where the review
// went on to read the arguments and state what they were, because a name beside a call nobody read
// claims a review that never happened. This holds the map to that rule rather than to a comment.
describe('ETH_CALL_NAMES', () => {
	const args = 'de'.repeat(64);

	it.each(Object.keys(ETH_CALL_NAMES))(
		'should only name %s if the review reads that call',
		(selector) => {
			const { type } = classifyWalletConnectEthCall(`${selector}${args}`);

			// A batch wrapper is read by opening its `bytes[]`, which classification reports as
			// unknown because the wrapper itself is not a call OISY describes.
			const readAsBatch = selector in MULTICALL_ARGUMENTS;

			expect(readAsBatch || type !== 'unknown').toBeTruthy();
		}
	);

	it('should name every call the review decodes', () => {
		const decoded = ['erc20Approve', 'erc20Transfer', 'setApprovalForAll', 'erc20AllowanceDelta'];

		const named = Object.keys(ETH_CALL_NAMES)
			.map((selector) => classifyWalletConnectEthCall(`${selector}${args}`).type)
			.filter((type) => type !== 'unknown');

		// Every decoded shape has at least one named selector, so a decoder cannot be added while
		// its call keeps rendering as bare hex.
		decoded.forEach((type) => expect(named).toContain(type));
	});

	it('should name every batch wrapper it knows how to open', () => {
		Object.keys(MULTICALL_ARGUMENTS).forEach((selector) =>
			expect(ETH_CALL_NAMES[selector]).toBeDefined()
		);
	});
});
