use std::ops::{Add, Sub};

#[allow(dead_code)]
pub fn assert_greater_than<T: PartialOrd + std::fmt::Debug>(a: T, b: T) {
    assert!(
        a > b,
        "Expected left value ({:?}) to be greater than right value ({:?})",
        a,
        b
    );
}

#[allow(dead_code)]
pub fn assert_less_than<T: PartialOrd + std::fmt::Debug>(a: T, b: T) {
    assert!(
        a < b,
        "Expected left value ({:?}) to be less than right value ({:?})",
        a,
        b
    );
}

#[allow(dead_code)]
pub fn assert_in_range<T>(value: T, min: T, max: T)
where
    T: PartialOrd + std::fmt::Debug,
{
    assert!(
        value >= min && value <= max,
        "Value {:?} not in range [{:?}, {:?}]",
        value,
        min,
        max
    );
}

pub fn assert_deviation<T>(value: T, expected_value: T, max_deviation: T)
where
    T: PartialOrd + std::fmt::Debug + Sub<Output = T> + Add<Output = T> + Clone,
{
    // Handle underflow by using saturating subtraction concept
    let min_value = if expected_value >= max_deviation {
        expected_value.clone() - max_deviation.clone()
    } else {
        // If subtraction would underflow, use a default minimum (typically zero for unsigned types)
        // For this case, we'll use the expected_value itself as the minimum bound
        expected_value.clone() - expected_value.clone() // This effectively gives us zero for
                                                        // numeric types
    };

    let max_value = expected_value.clone() + max_deviation.clone();

    assert!(
        value >= min_value && value <= max_value,
        "Value {:?} not in range [{:?}, {:?}] of deviation {:?}",
        value.clone(),
        min_value,
        max_value,
        max_deviation
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    // Test for assert_greater_than
    #[test]
    fn test_assert_greater_than() {
        assert_greater_than(10, 5);
        assert_greater_than(9.8, 1.2);

        let result = std::panic::catch_unwind(|| assert_greater_than(5, 10)); // Should panic
        assert!(
            result.is_err(),
            "Expected assert_greater_than to panic when the first value is not greater."
        );
    }

    // Test for assert_less_than
    #[test]
    fn test_assert_less_than() {
        assert_less_than(5, 10);
        assert_less_than(1.2, 9.8);

        let result = std::panic::catch_unwind(|| assert_less_than(10, 5)); // Should panic
        assert!(
            result.is_err(),
            "Expected assert_less_than to panic when the first value is not less."
        );
    }

    #[test]
    fn test_assert_in_range() {
        assert_in_range(5, 1, 10);
        assert_in_range(1.5, 1.0, 2.0);
        assert_in_range(10, 10, 10);

        let result = std::panic::catch_unwind(|| assert_in_range(15, 1, 10)); // Should panic
        assert!(
            result.is_err(),
            "Expected assert_in_range to panic for a value outside the range."
        );
    }

    // Test for assert_deviation
    #[test]
    fn test_assert_deviation() {
        assert_deviation(100, 90, 20);

        let result = std::panic::catch_unwind(|| assert_deviation(100, 90, 5)); // Should panic
        assert!(
            result.is_err(),
            "Expected assert_deviation to panic for a value outside the allowed deviation."
        );
    }
}
