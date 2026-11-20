"""Unit tests for time engine conversions, window arithmetic, and midnight crossings."""

import pytest
from simulation.time_engine import (
    calculate_delay,
    compute_closure_window,
    is_in_closure_window,
    minutes_to_time,
    minutes_to_time_display,
    time_to_minutes,
)


def test_time_to_minutes_valid():
    assert time_to_minutes("00:00") == 0
    assert time_to_minutes("08:00") == 480
    assert time_to_minutes("09:30") == 570
    assert time_to_minutes("14:25") == 865
    assert time_to_minutes("23:59") == 1439


def test_time_to_minutes_invalid_inputs():
    with pytest.raises(ValueError):
        time_to_minutes("24:00")
    with pytest.raises(ValueError):
        time_to_minutes("08:60")
    with pytest.raises(ValueError):
        time_to_minutes("invalid")
    with pytest.raises(ValueError):
        time_to_minutes("8:0")
    with pytest.raises(TypeError):
        time_to_minutes(480)  # type: ignore


def test_minutes_to_time_valid():
    assert minutes_to_time(0) == "00:00"
    assert minutes_to_time(480) == "08:00"
    assert minutes_to_time(570) == "09:30"
    assert minutes_to_time(865) == "14:25"
    assert minutes_to_time(1439) == "23:59"


def test_minutes_to_time_midnight_crossing():
    # 24:00 wraps to 00:00
    assert minutes_to_time(1440) == "00:00"
    # 25:15 wraps to 01:15
    assert minutes_to_time(1515) == "01:15"
    # Display format shows +1d
    assert minutes_to_time_display(1515) == "01:15 (+1d)"


def test_closure_window_calculation():
    start_mins, end_mins, end_str = compute_closure_window("08:00", 90)
    assert start_mins == 480
    assert end_mins == 570
    assert end_str == "09:30"

    with pytest.raises(ValueError):
        compute_closure_window("08:00", 0)
    with pytest.raises(ValueError):
        compute_closure_window("08:00", -30)


def test_is_in_closure_window():
    # Window [480, 570)
    assert not is_in_closure_window(479, 480, 570)
    assert is_in_closure_window(480, 480, 570)  # inclusive start
    assert is_in_closure_window(500, 480, 570)
    assert not is_in_closure_window(570, 480, 570)  # exclusive end (re-opened)
    assert not is_in_closure_window(571, 480, 570)


def test_calculate_delay():
    assert calculate_delay(480, 480) == 0
    assert calculate_delay(480, 510) == 30
    # Earlier than scheduled is 0 delay
    assert calculate_delay(480, 450) == 0
