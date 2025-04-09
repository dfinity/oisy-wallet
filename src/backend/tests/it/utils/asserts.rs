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
    // panic if underflow occurs
    let min_value = (expected_value >= max_deviation.clone())
        .then(|| expected_value.clone() - max_deviation.clone())
        .ok_or_else(|| {
            format!(
                "Underflow error: Cannot subtract deviation {:?} from expected value {:?}",
                max_deviation, expected_value
            )
        })
        .expect("Underflow occurred!");

    // panic if overflow occurs
    let max_value = (expected_value <= expected_value.clone() + max_deviation.clone())
        .then(|| expected_value.clone() + max_deviation.clone())
        .ok_or_else(|| {
            format!(
                "Overflow error: Cannot add deviation {:?} to expected value {:?}",
                max_deviation, expected_value
            )
        })
        .expect("Overflow occurred!");

    assert!(
        value >= min_value && value <= max_value,
        "Value {:?} not in range [{:?}, {:?}] of deviation {:?}",
        value.clone(),
        min_value,
        max_value,
        (value - expected_value)
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
