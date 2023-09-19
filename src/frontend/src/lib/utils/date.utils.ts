import {
	DAYS_IN_NON_LEAP_YEAR,
	HOURS_IN_DAY,
	MINUTES_IN_HOUR,
	SECONDS_IN_MINUTE
} from '$lib/constants/app.constants';

export const secondsToDuration = (seconds: bigint): string => {
	let minutes = seconds / BigInt(SECONDS_IN_MINUTE);

	let hours = minutes / BigInt(MINUTES_IN_HOUR);
	minutes -= hours * BigInt(MINUTES_IN_HOUR);

	let days = hours / BigInt(HOURS_IN_DAY);
	hours -= days * BigInt(HOURS_IN_DAY);

	const years = fullYearsInDays(days);
	days -= daysInYears(years);

	const time: Record<string, string> = {
		year: 'year',
		year_plural: 'years',
		month: 'month',
		month_plural: 'months',
		day: 'day',
		day_plural: 'days',
		hour: 'hour',
		hour_plural: 'hours',
		minute: 'minute',
		minute_plural: 'minutes',
		second: 'second',
		second_plural: 'seconds'
	};

	const periods = [
		createLabel('year', years),
		createLabel('day', days),
		createLabel('hour', hours),
		createLabel('minute', minutes),
		...(seconds > BigInt(0) && seconds < BigInt(60) ? [createLabel('second', seconds)] : [])
	];

	return periods
		.filter(({ amount }) => amount > 0)
		.slice(0, 2)
		.map(
			(labelInfo) =>
				`${labelInfo.amount} ${
					labelInfo.amount === 1 ? time[labelInfo.labelKey] : time[`${labelInfo.labelKey}_plural`]
				}`
		)
		.join(', ');
};

const fullYearsInDays = (days: bigint): bigint => {
	// Use integer division.
	let years = days / BigInt(DAYS_IN_NON_LEAP_YEAR);
	while (daysInYears(years) > days) {
		years--;
	}
	return years;
};

const daysInYears = (years: bigint): bigint => {
	// Use integer division.
	const leapDays = years / BigInt(4);
	return years * BigInt(DAYS_IN_NON_LEAP_YEAR) + leapDays;
};

type LabelKey = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second';
type LabelInfo = {
	labelKey: LabelKey;
	amount: number;
};
const createLabel = (labelKey: LabelKey, amount: bigint): LabelInfo => ({
	labelKey,
	amount: Number(amount)
});
