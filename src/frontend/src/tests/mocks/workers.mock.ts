export const mockEventData = { value: 'mockData' };

export const createMockEvent = (msg: string) => ({
	data: { msg, data: mockEventData }
});
