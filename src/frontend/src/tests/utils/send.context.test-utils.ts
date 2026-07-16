import { initSendContext, SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
import type { MockContextEntry } from '$tests/utils/context.test-utils';

export const mockSendContext = (params: Parameters<typeof initSendContext>[0]): SendContext =>
	initSendContext(params);

export const mockSendContextEntry = (
	params: Parameters<typeof initSendContext>[0]
): MockContextEntry => [SEND_CONTEXT_KEY, mockSendContext(params)];
