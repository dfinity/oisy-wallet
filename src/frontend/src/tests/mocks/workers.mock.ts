import { POST_MESSAGE_REQUESTS } from '$lib/schema/post-message.schema';

export const mockEventData = { value: 'mockData' };

export const createMockEvent = (msg: string) => ({
	data: { msg, data: mockEventData }
});

export const excludeValidMessageEvents = (validMessages: string[]) =>
	POST_MESSAGE_REQUESTS.filter((message) => !validMessages.includes(message));
