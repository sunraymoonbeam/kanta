"""
Unit tests for the events models.
"""
from datetime import datetime, timedelta, timezone
import pytest

from ..models import Event
from app.images.models import Image


class TestEventModel:
    """Tests for the Event model."""
    
    def test_running_property_current_event(self):
        """Test the running property when event is in progress."""
        now = datetime.now(timezone.utc)
        event = Event(
            id=1,
            code="test-event",
            name="Test Event",
            start_date_time=now - timedelta(hours=1),
            end_date_time=now + timedelta(hours=1),
        )
        
        assert event.running is True
        
    def test_running_property_future_event(self):
        """Test the running property when event is in the future."""
        now = datetime.now(timezone.utc)
        event = Event(
            id=2,
            code="future-event",
            name="Future Event",
            start_date_time=now + timedelta(days=1),
            end_date_time=now + timedelta(days=2),
        )
        
        assert event.running is False
        
    def test_running_property_past_event(self):
        """Test the running property when event is in the past."""
        now = datetime.now(timezone.utc)
        event = Event(
            id=3,
            code="past-event",
            name="Past Event", 
            start_date_time=now - timedelta(days=2),
            end_date_time=now - timedelta(days=1),
        )
        
        assert event.running is False
        
    def test_running_property_without_dates(self):
        """Test the running property when dates are not set."""
        event = Event(
            id=4,
            code="no-dates-event",
            name="No Dates Event",
        )
        
        assert event.running is False
        
    def test_running_property_with_only_start_date(self):
        """Test the running property when only start date is set."""
        now = datetime.now(timezone.utc)
        event = Event(
            id=5,
            code="start-only-event",
            name="Start Only Event",
            start_date_time=now - timedelta(hours=1),
        )
        
        assert event.running is False
        
    def test_running_property_with_only_end_date(self):
        """Test the running property when only end date is set."""
        now = datetime.now(timezone.utc)
        event = Event(
            id=6,
            code="end-only-event",
            name="End Only Event",
            end_date_time=now + timedelta(hours=1),
        )
        
        assert event.running is False
