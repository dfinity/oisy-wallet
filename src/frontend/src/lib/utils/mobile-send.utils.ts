import { isMobileEthSendToken } from '$eth/utils/mobile-send.utils';
import { isMobileSendToken } from '$icp/utils/ic-send.utils';
import type { OptionToken } from '$lib/types/token';

export const isMobileTransferToken = (token: OptionToken): boolean =>
	isMobileSendToken(token) || isMobileEthSendToken(token);
