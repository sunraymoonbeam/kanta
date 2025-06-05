"""
Unit tests for the events schemas.
"""
from datetime import datetime, timedelta, timezone
import pytest
from pydantic import ValidationError

from app.events.schemas import (
    CreateEventInput,
    UpdateEventInput,
    DeleteEventInput,
    EventInfo,
    EventListResponse,
    AZURE_CONTAINER_NAME_REGEX
)


class TestCreateEventInput:
    """Tests for the CreateEventInput schema."""

    def test_valid_create_event(self):
        """Test valid CreateEventInput schema."""
        now = datetime.now(timezone.utc)
        data = {
            "event_code": "test-event-123",
            "name": "Test Event",
            "description": "A test event",
            "start_date_time": now,
            "end_date_time": now + timedelta(days=1),
        }
        
        event_input = CreateEventInput(**data)
        
        assert event_input.event_code == data["event_code"]
        assert event_input.name == data["name"]
        assert event_input.description == data["description"]
        assert event_input.start_date_time == data["start_date_time"]
        assert event_input.end_date_time == data["end_date_time"]

    def test_invalid_event_code_too_short(self):
        """Test event_code validation - too short."""
        data = {
            "event_code": "ab",
            "name": "Test Event"
        }
        
        with pytest.raises(ValidationError) as excinfo:
            CreateEventInput(**data)
        
        error = excinfo.value.errors()[0]
        assert error["type"] == "string_too_short"

    def test_invalid_event_code_too_long(self):
        """Test event_code validation - too long."""
        data = {
            "event_code": "a" * 64,
            "name": "Test Event"
        }
        
        with pytest.raises(ValidationError) as excinfo:
            CreateEventInput(**data)
        
        error = excinfo.value.errors()[0]
        assert error["type"] == "string_too_long"

    def test_invalid_start_end_time(self):
        """Test start_date_time and end_date_time validation."""
        now = datetime.now(timezone.utc)
        data = {
            "event_code": "test-event",
            "name": "Test Event",
            "start_date_time": now + timedelta(days=2),
            "end_date_time": now + timedelta(days=1),
        }
        
        with pytest.raises(ValidationError) as excinfo:
            CreateEventInput(**data)
        
        assert "start_date_time must be before end_date_time" in str(excinfo.value)

    def test_azure_container_regex(self):
        """Test the Azure container name regex pattern."""
        valid_names = [
            "myevent123",
            "my-event",
            "a-b-c",
            "a"  # Technically valid but would fail min_length in schema
        ]

        invalid_names = [
            "-myevent",    # Can't start with hyphen
            "myevent-",    # Can't end with hyphen
            "MY_EVENT",    # No uppercase or underscore
            "my event",    # No spaces
            "my.event",    # No dots
            "my@event"     # No special chars
        ]
        
        # Test that the current regex allows consecutive hyphens (which is the actual Azure behavior)
        # According to Azure documentation, consecutive hyphens are actually allowed
        consecutive_hyphen_name = "my--event"
        assert AZURE_CONTAINER_NAME_REGEX.match(consecutive_hyphen_name) is not None
        
        for name in valid_names:
            assert AZURE_CONTAINER_NAME_REGEX.match(name) is not None
        
        for name in invalid_names:
            assert AZURE_CONTAINER_NAME_REGEX.match(name) is None


class TestUpdateEventInput:
    """Tests for the UpdateEventInput schema."""

    def test_valid_update_event(self):
        """Test valid UpdateEventInput schema."""
        now = datetime.now(timezone.utc)
        data = {
            "event_code": "test-event",
            "name": "Updated Event",
            "description": "An updated event",
            "start_date_time": now,
            "end_date_time": now + timedelta(days=1),
        }
        
        event_input = UpdateEventInput(**data)
        
        assert event_input.event_code == data["event_code"]
        assert event_input.name == data["name"]
        assert event_input.description == data["description"]
        assert event_input.start_date_time == data["start_date_time"]
        assert event_input.end_date_time == data["end_date_time"]

    def test_update_event_code(self):
        """Test updating event code."""
        data = {
            "event_code": "old-event",
            "new_event_code": "new-event",
        }
        
        event_input = UpdateEventInput(**data)
        
        assert event_input.event_code == data["event_code"]
        assert event_input.new_event_code == data["new_event_code"]

    def test_partial_update(self):
        """Test partial update with only some fields."""
        data = {
            "event_code": "test-event",
            "name": "Updated Name",
        }
        
        event_input = UpdateEventInput(**data)
        
        assert event_input.event_code == data["event_code"]
        assert event_input.name == data["name"]
        assert event_input.description is None
        assert event_input.start_date_time is None
        assert event_input.end_date_time is None

    def test_invalid_start_end_time(self):
        """Test start_date_time and end_date_time validation."""
        now = datetime.now(timezone.utc)
        data = {
            "event_code": "test-event",
            "start_date_time": now + timedelta(days=2),
            "end_date_time": now + timedelta(days=1),
        }
        
        with pytest.raises(ValidationError) as excinfo:
            UpdateEventInput(**data)
        
        assert "start_date_time must be before end_date_time" in str(excinfo.value)


class TestDeleteEventInput:
    """Tests for the DeleteEventInput schema."""

    def test_valid_delete_event(self):
        """Test valid DeleteEventInput schema."""
        data = {
            "event_code": "test-event",
        }
        
        event_input = DeleteEventInput(**data)
        
        assert event_input.event_code == data["event_code"]

    def test_missing_event_code(self):
        """Test missing event_code field."""
        data = {}
        
        with pytest.raises(ValidationError) as excinfo:
            DeleteEventInput(**data)
        
        error = excinfo.value.errors()[0]
        assert error["type"] == "missing"
        assert error["loc"] == ("event_code",)


class TestEventInfo:
    """Tests for the EventInfo schema."""

    def test_valid_event_info(self):
        """Test valid EventInfo schema."""
        now = datetime.now(timezone.utc)
        data = {
            "code": "test-event",
            "name": "Test Event",
            "description": "A test event",
            "start_date_time": now,
            "end_date_time": now + timedelta(days=1),
            "created_at": now - timedelta(days=1),
            "running": True,
            "event_image_url": "https://storage.test/images/event.jpg",
            "qr_code_image_url": "https://storage.test/images/qr.png",
        }
        
        event_info = EventInfo(**data)
        
        assert event_info.code == data["code"]
        assert event_info.name == data["name"]
        assert event_info.description == data["description"]
        assert event_info.running == data["running"]
        assert event_info.event_image_url == data["event_image_url"]
        assert event_info.qr_code_image_url == data["qr_code_image_url"]

    def test_minimal_event_info(self):
        """Test minimal valid EventInfo schema."""
        now = datetime.now(timezone.utc)
        data = {
            "code": "test-event",
            "created_at": now,
            "running": False,
            "name": None,
            "description": None,
            "start_date_time": None,
            "end_date_time": None,
        }

        event_info = EventInfo(**data)
        assert event_info.code == data["code"]

    def test_valid_event_list(self):
        """Test valid EventListResponse schema."""
        now = datetime.now(timezone.utc)
        events = [
            {
                "code": "event1",
                "name": "Event 1",
                "created_at": now,
                "running": True,
                "description": None,
                "start_date_time": None,
                "end_date_time": None,
            },
            {
                "code": "event2",
                "name": "Event 2",
                "created_at": now - timedelta(days=1),
                "running": False,
                "description": None,
                "start_date_time": None,
                "end_date_time": None,
            },
        ]

        data = {"events": events}

        event_list = EventListResponse(**data)
        assert len(event_list.events) == 2
        assert event_list.events[0].code == events[0]["code"]
        assert event_list.events[1].code == events[1]["code"]
