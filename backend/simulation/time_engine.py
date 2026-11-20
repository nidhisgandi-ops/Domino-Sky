"""Time engine for converting and manipulating flight network times.

All operational times are local IST (UTC+05:30) on a 24-hour clock.
This module handles integer minute conversions, midnight crossings,
and interval window calculations.
"""

from typing import Tuple


def time_to_minutes(time_str: str) -> int:
    """Convert an HH:MM 24-hour string to integer minutes from 00:00.

    Examples:
        '00:00' -> 0
        '08:00' -> 480
        '14:25' -> 865
        '23:59' -> 1439
    """
    if not isinstance(time_str, str):
        raise TypeError(f"Expected time string, got {type(time_str).__name__}")
    parts = time_str.strip().split(":")
    if len(parts) != 2 or len(parts[0]) != 2 or len(parts[1]) != 2:
        raise ValueError(f"Invalid time format '{time_str}'. Expected 'HH:MM'")
    try:
        hours = int(parts[0])
        minutes = int(parts[1])
    except ValueError as e:
        raise ValueError(f"Invalid time components in '{time_str}': {e}") from e

    if hours < 0 or hours > 23:
        raise ValueError(f"Hours out of range [0-23] in '{time_str}'")
    if minutes < 0 or minutes > 59:
        raise ValueError(f"Minutes out of range [0-59] in '{time_str}'")

    return hours * 60 + minutes


def minutes_to_time(minutes: int) -> str:
    """Convert integer minutes from 00:00 back to HH:MM format.

    Handles midnight crossings safely with modular arithmetic (modulo 1440).
    Negative minutes wrap backwards around midnight.
    """
    normalized = minutes % 1440
    hours = normalized // 60
    mins = normalized % 60
    return f"{hours:02d}:{mins:02d}"


def minutes_to_time_display(minutes: int) -> str:
    """Convert integer minutes to HH:MM with optional +1d / +2d indicator if crossing midnight."""
    days = minutes // 1440
    normalized = minutes % 1440
    hours = normalized // 60
    mins = normalized % 60
    base_time = f"{hours:02d}:{mins:02d}"
    if days > 0:
        return f"{base_time} (+{days}d)"
    return base_time


def is_in_closure_window(time_mins: int, closure_start_mins: int, closure_end_mins: int) -> bool:
    """Check if time_mins falls inside the closure window [closure_start_mins, closure_end_mins).

    An airport closure is effective starting at closure_start_mins and ends at closure_end_mins.
    At closure_end_mins the airport is open for flights.
    """
    return closure_start_mins <= time_mins < closure_end_mins


def compute_closure_window(start_time: str, duration_minutes: int) -> Tuple[int, int, str]:
    """Compute (start_mins, end_mins, end_time_str) given start HH:MM and duration."""
    if duration_minutes <= 0:
        raise ValueError("Closure duration must be strictly positive")
    start_mins = time_to_minutes(start_time)
    end_mins = start_mins + duration_minutes
    end_time = minutes_to_time(end_mins)
    return start_mins, end_mins, end_time


def calculate_delay(scheduled_mins: int, actual_mins: int) -> int:
    """Calculate non-negative delay in minutes."""
    return max(0, actual_mins - scheduled_mins)
