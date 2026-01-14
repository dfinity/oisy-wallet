export const fetchOpenCryptoPay = async <T>(apiUrl: string): Promise<T> => {
	const response = await fetch(apiUrl, {
		method: 'GET',
		headers: { 'Content-Type': 'application/json' }
	});

	if (!response.ok) {
		throw new Error('Fetching OpenCryptoPay failed.');
	}

	return response.json();
};
