import { RECEIVE_TOKENS_MODAL_ADDRESS_LABEL } from '$lib/constants/test-ids.constants';

/**
 * Generates a selector that can be used to query an inner element by specifying its parent
 */
export const getNestedSelector = ({
	parentSelector,
	innerSelector
}: {
	parentSelector: string;
	innerSelector: string;
}) => `[data-tid="${parentSelector}"] >> [data-tid="${innerSelector}"]`;

export const getReceiveTokensModalAddressLabelSelector = ({
	sectionSelector
}: {
	sectionSelector: string;
}) =>
	getNestedSelector({
		parentSelector: sectionSelector,
		innerSelector: RECEIVE_TOKENS_MODAL_ADDRESS_LABEL
	});
