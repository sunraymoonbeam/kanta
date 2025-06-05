"""
Unit tests for the events models.
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from app.events.models import Event


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
        
    def test_running_property_exact_start_boundary(self):
        """Test the running property exactly at start time."""
        fixed_time = datetime(2024, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
        
        with patch('datetime.datetime') as mock_datetime:
            mock_datetime.now.return_value = fixed_time
            mock_datetime.timezone = timezone
            
            event = Event(
                id=7,
                code="exact-start-event",
                name="Exact Start Event",
                start_date_time=fixed_time,
                end_date_time=fixed_time + timedelta(hours=2),
            )
            
            assert event.running is True
            
    def test_running_property_exact_end_boundary(self):
        """Test the running property exactly at end time."""
        fixed_time = datetime(2024, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
        
        with patch('datetime.datetime') as mock_datetime:
            mock_datetime.now.return_value = fixed_time
            mock_datetime.timezone = timezone
            
            event = Event(
                id=8,
                code="exact-end-event",
                name="Exact End Event",
                start_date_time=fixed_time - timedelta(hours=2),
                end_date_time=fixed_time,
            )
            
            assert event.running is True
            
    def test_running_property_microsecond_precision(self):
        """Test the running property with microsecond precision timing."""
        fixed_time = datetime(2024, 1, 15, 12, 0, 0, 123456, tzinfo=timezone.utc)
        
        with patch('datetime.datetime') as mock_datetime:
            mock_datetime.now.return_value = fixed_time
            mock_datetime.timezone = timezone
            
            event = Event(
                id=9,
                code="microsecond-event",
                name="Microsecond Event",
                start_date_time=fixed_time - timedelta(microseconds=1),
                end_date_time=fixed_time + timedelta(microseconds=1),
            )
            
            assert event.running is True
            
    def test_running_property_just_before_start(self):
        """Test the running property just before start time."""
        fixed_time = datetime(2024, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
        
        with patch('datetime.datetime') as mock_datetime:
            mock_datetime.now.return_value = fixed_time
            mock_datetime.timezone = timezone
            
            event = Event(
                id=10,
                code="before-start-event",
                name="Before Start Event",
                start_date_time=fixed_time + timedelta(seconds=1),
                end_date_time=fixed_time + timedelta(hours=2),
            )
            
            assert event.running is False
            
    def test_running_property_just_after_end(self):
        """Test the running property just after end time."""
        fixed_time = datetime(2024, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
        
        with patch('datetime.datetime') as mock_datetime:
            mock_datetime.now.return_value = fixed_time
            mock_datetime.timezone = timezone
            
            event = Event(
                id=11,
                code="after-end-event",
                name="After End Event",
                start_date_time=fixed_time - timedelta(hours=2),
                end_date_time=fixed_time - timedelta(seconds=1),
            )
            
            assert event.running is False
            
    def test_event_model_creation_with_minimal_fields(self):
        """Test creating an Event with only required fields."""
        event = Event(
            code="minimal-event"
        )
        
        assert event.code == "minimal-event"
        assert event.name is None
        assert event.description is None
        assert event.start_date_time is None
        assert event.end_date_time is None
        assert event.event_image_url is None
        assert event.qr_code_image_url is None
        assert event.running is False
        
    def test_event_model_creation_with_all_fields(self):
        """Test creating an Event with all fields populated."""
        now = datetime.now(timezone.utc)
        event = Event(
            id=12,
            code="full-event",
            name="Full Event",
            description="A complete event with all fields",
            start_date_time=now + timedelta(days=1),
            end_date_time=now + timedelta(days=2),
            event_image_url="https://example.com/event.jpg",
            qr_code_image_url="https://example.com/qr.png"
        )
        
        assert event.code == "full-event"
        assert event.name == "Full Event"
        assert event.description == "A complete event with all fields"
        assert event.start_date_time == now + timedelta(days=1)
        assert event.end_date_time == now + timedelta(days=2)
        assert event.event_image_url == "https://example.com/event.jpg"
        assert event.qr_code_image_url == "https://example.com/qr.png"
        assert event.running is False
        
    def test_event_tablename(self):
        """Test that the Event model has the correct table name."""
        assert Event.__tablename__ == "events"
        
    def test_event_images_relationship(self):
        """Test that the Event model has an images relationship."""
        event = Event(code="relationship-test")
        
        assert hasattr(event, 'images')
        assert event.images == []
    
    def test_running_property_with_none_start_date(self):
        """Test running property when start_date_time is explicitly None."""
        now = datetime.now(timezone.utc)
        event = Event(
            id=13,
            code="none-start-event",
            name="None Start Event",
            start_date_time=None,
            end_date_time=now + timedelta(hours=1),
        )
        
        assert event.running is False
        
    def test_running_property_with_none_end_date(self):
        """Test running property when end_date_time is explicitly None."""
        now = datetime.now(timezone.utc)
        event = Event(
            id=14,
            code="none-end-event",
            name="None End Event",
            start_date_time=now - timedelta(hours=1),
            end_date_time=None,
        )
        
        assert event.running is False
        
    def test_running_property_timezone_aware(self):
        """Test that running property works correctly with timezone-aware datetimes."""
        utc_time = datetime(2024, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
        
        with patch('datetime.datetime') as mock_datetime:
            mock_datetime.now.return_value = utc_time
            mock_datetime.timezone = timezone
            
            event = Event(
                id=15,
                code="timezone-event",
                name="Timezone Event",
                start_date_time=utc_time - timedelta(hours=1),
                end_date_time=utc_time + timedelta(hours=1),
            )
            
            assert event.running is True
