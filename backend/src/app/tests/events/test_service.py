"""
Unit tests for the events service module.
"""
from datetime import datetime, timedelta, timezone
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from azure.core.exceptions import ResourceExistsError, ResourceNotFoundError

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.events.exceptions import EventAlreadyExists, EventNotFound
from app.events.models import Event
from app.events.schemas import CreateEventInput, UpdateEventInput
from app.events.service import (
    get_events,
    get_event,
    create_event,
    update_event,
    delete_event,
    upsert_event_image,
    _generate_and_upload_qr,
)


@pytest.fixture
def event_data():
    """Sample event data for testing."""
    utc_now = datetime.now(timezone.utc)
    return {
        "code": "test-event", 
        "name": "Test Event",
        "description": "A test event",
        "start_date_time": utc_now,
        "end_date_time": utc_now + timedelta(days=1),
        "created_at": utc_now,
        "event_image_url": None,
        "qr_code_image_url": None,
        "id": 1
    }


@pytest.fixture
def running_event_data():
    """Sample event data for a currently running event."""
    utc_now = datetime.now(timezone.utc)
    return {
        "code": "running-event", 
        "name": "Running Event",
        "description": "A running test event",
        "start_date_time": utc_now - timedelta(hours=1),
        "end_date_time": utc_now + timedelta(hours=1),
        "created_at": utc_now - timedelta(days=1),
        "event_image_url": None,
        "qr_code_image_url": None,
        "id": 2
    }


@pytest.fixture
def past_event_data():
    """Sample event data for a past event."""
    utc_now = datetime.now(timezone.utc)
    return {
        "code": "past-event", 
        "name": "Past Event",
        "description": "A past test event",
        "start_date_time": utc_now - timedelta(days=2),
        "end_date_time": utc_now - timedelta(days=1),
        "created_at": utc_now - timedelta(days=3),
        "event_image_url": None,
        "qr_code_image_url": None,
        "id": 3
    }


@pytest.fixture
def future_event_data():
    """Sample event data for a future event."""
    utc_now = datetime.now(timezone.utc)
    return {
        "code": "future-event", 
        "name": "Future Event",
        "description": "A future test event",
        "start_date_time": utc_now + timedelta(days=1),
        "end_date_time": utc_now + timedelta(days=2),
        "created_at": utc_now,
        "event_image_url": None,
        "qr_code_image_url": None,
        "id": 4
    }


@pytest.fixture
def create_event_input():
    """Sample CreateEventInput for testing."""
    utc_now = datetime.now(timezone.utc)
    return CreateEventInput(
        event_code="new-event",
        name="New Test Event",
        description="A new test event",
        start_date_time=utc_now + timedelta(days=1),
        end_date_time=utc_now + timedelta(days=2),
    )


@pytest.fixture
def update_event_input():
    """Sample UpdateEventInput for testing."""
    utc_now = datetime.now(timezone.utc)
    return UpdateEventInput(
        event_code="test-event",
        name="Updated Test Event",
        description="An updated test event",
        start_date_time=utc_now + timedelta(days=2),
        end_date_time=utc_now + timedelta(days=3),
    )


@pytest.fixture
def update_event_code_input():
    """Sample UpdateEventInput for testing with code change."""
    return UpdateEventInput(
        event_code="test-event",
        new_event_code="updated-event",
        name="Updated Test Event",
    )


@pytest.fixture
def mock_db():
    """Mock AsyncSession for testing."""
    session = AsyncMock(spec=AsyncSession)
    return session


@pytest.fixture
def mock_blob_service():
    mock_service = MagicMock()
    mock_container = MagicMock()  # Changed from AsyncMock to MagicMock for sync methods
    mock_service.get_container_client.return_value = mock_container
    mock_container.create_container.side_effect = ResourceExistsError("Container exists")
    mock_container.list_blobs.return_value = []  # Return empty list for blob listing
    mock_container.download_blob.return_value = MagicMock()
    mock_container.upload_blob = AsyncMock()  # Only upload_blob is async
    # Set up async methods for the service itself
    mock_service.create_container = AsyncMock()
    mock_service.delete_container = AsyncMock()
    return mock_service


@pytest.fixture
def mock_container():
    """Mock ContainerClient for testing."""
    container = MagicMock()
    container.url = "https://storage.test/container"
    container.upload_blob = AsyncMock()
    return container


@pytest.fixture
def mock_upload_file():
    """Mock UploadFile for testing."""
    content = b"test-image-bytes"
    upload_file = MagicMock(spec=UploadFile)
    upload_file.filename = "test_image.jpg"
    upload_file.read.return_value = content
    return upload_file


class TestGetEvents:
    """Tests for the get_events function."""
    
    @pytest.mark.asyncio
    async def test_get_all_events(self, mock_db, event_data, running_event_data):
        # Setup mock
        mock_result = MagicMock()
        event1 = Event(**event_data)
        event2 = Event(**running_event_data)
        mock_result.scalars().all.return_value = [event1, event2]
        mock_db.execute.return_value = mock_result
        
        # Execute
        result = await get_events(mock_db)
        
        # Assert
        assert len(result) == 2
        assert result[0].code == event_data["code"]
        assert result[1].code == running_event_data["code"]
        mock_db.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_events_by_code(self, mock_db, event_data):
        # Setup mock
        mock_result = MagicMock()
        event = Event(**event_data)
        mock_result.scalars().all.return_value = [event]
        mock_db.execute.return_value = mock_result
        
        # Execute
        result = await get_events(mock_db, event_code=event_data["code"])
        
        # Assert
        assert len(result) == 1
        assert result[0].code == event_data["code"]
        mock_db.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_running_events(self, mock_db, event_data, running_event_data, past_event_data, future_event_data):
        # Setup mock
        mock_result = MagicMock()
        event1 = Event(**event_data)
        event2 = Event(**running_event_data)
        event3 = Event(**past_event_data)
        event4 = Event(**future_event_data)
        
        mock_result.scalars().all.return_value = [event1, event2, event3, event4]
        mock_db.execute.return_value = mock_result
        
        # Mock running property to return appropriate values for each event
        with patch.object(Event, 'running', new_callable=lambda: property(lambda self: self.code == 'running-event')):
            # Execute for running=True
            result = await get_events(mock_db, running=True)
            
            # Assert only running event is returned
            assert len(result) == 1
            assert result[0].code == running_event_data["code"]

            # Execute for running=False
            mock_db.execute.reset_mock()
            mock_result.scalars().all.return_value = [event1, event2, event3, event4]
            mock_db.execute.return_value = mock_result
            
            result = await get_events(mock_db, running=False)
            
            # Assert non-running events are returned
            assert len(result) == 3
            codes = [e.code for e in result]
            assert event_data["code"] in codes
            assert past_event_data["code"] in codes
            assert future_event_data["code"] in codes


class TestGetEvent:
    """Tests for the get_event function."""
    
    @pytest.mark.asyncio
    async def test_get_event_success(self, mock_db, event_data):
        # Setup mock
        mock_result = MagicMock()
        event = Event(**event_data)
        mock_result.scalar_one_or_none.return_value = event
        mock_db.execute.return_value = mock_result
        
        # Execute
        result = await get_event(mock_db, event_data["code"])
        
        # Assert
        assert result.code == event_data["code"]
        assert result.name == event_data["name"]
        mock_db.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_event_not_found(self, mock_db):
        # Setup mock
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        
        # Execute and assert
        with pytest.raises(EventNotFound) as excinfo:
            await get_event(mock_db, "nonexistent")
        
        assert "not found" in str(excinfo.value)
        mock_db.execute.assert_called_once()


class TestCreateEvent:
    """Tests for the create_event function."""
    
    @pytest.mark.asyncio
    async def test_create_event_success(self, mock_db, create_event_input):
        # Execute
        result = await create_event(mock_db, create_event_input)
        
        # Assert
        assert result.code == create_event_input.event_code
        assert result.name == create_event_input.name
        assert result.description == create_event_input.description
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_event_duplicate(self, mock_db, create_event_input):
        # Setup mock to raise IntegrityError for duplicate code
        mock_db.commit.side_effect = IntegrityError(None, None, None)
        
        # Execute and assert
        with pytest.raises(EventAlreadyExists) as excinfo:
            await create_event(mock_db, create_event_input)
        
        assert create_event_input.event_code in str(excinfo.value)
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        mock_db.rollback.assert_called_once()


class TestGenerateAndUploadQR:
    """Tests for the _generate_and_upload_qr function."""
    
    @pytest.mark.asyncio
    async def test_generate_and_upload_qr(self, mock_db, mock_blob_service):
        # Setup mock
        event_id = 1
        event_code = "test-event"
        service_url = "https://test.domain.com"
        mock_event = MagicMock()
        mock_db.get.return_value = mock_event
        
        # Execute
        await _generate_and_upload_qr(event_id, event_code, mock_blob_service, service_url, mock_db)
        
        # Assert container creation and blob upload were called
        mock_blob_service.get_container_client.assert_called_with(event_code)
        container = mock_blob_service.get_container_client.return_value
        container.create_container.assert_called_once()
        container.upload_blob.assert_called_once()
        
        # Assert event update
        assert mock_event.qr_code_image_url == f"{container.url}/assets/qr.png"
        mock_db.commit.assert_called_once()
        
    @pytest.mark.asyncio
    async def test_generate_and_upload_qr_container_exists(self, mock_db, mock_blob_service):
        # Setup mock to simulate existing container
        event_id = 1
        event_code = "test-event"
        service_url = "https://test.domain.com"
        mock_event = MagicMock()
        mock_db.get.return_value = mock_event
        container = mock_blob_service.get_container_client.return_value
        container.create_container.side_effect = ResourceExistsError("Container exists")
        
        # Execute
        await _generate_and_upload_qr(event_id, event_code, mock_blob_service, service_url, mock_db)
        
        # Assert the error was handled and blob upload still happened
        container.upload_blob.assert_called_once()
        assert mock_event.qr_code_image_url == f"{container.url}/assets/qr.png"


class TestUpdateEvent:
    """Tests for the update_event function."""
    
    @pytest.mark.asyncio
    async def test_update_event_simple_fields(self, mock_db, mock_blob_service, event_data, update_event_input):
        # Setup mock
        event = Event(**event_data)
        
        with patch('app.events.service.get_event', return_value=event) as mock_get_event:
            # Execute
            result = await update_event(mock_db, update_event_input, mock_blob_service)
            
            # Assert
            mock_get_event.assert_called_once_with(mock_db, update_event_input.event_code)
            assert result.name == update_event_input.name
            assert result.description == update_event_input.description
            assert result.start_date_time == update_event_input.start_date_time
            assert result.end_date_time == update_event_input.end_date_time
            mock_db.commit.assert_called_once()
            mock_db.refresh.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_event_code(self, mock_db, mock_blob_service, event_data, update_event_code_input):
        # Setup mock
        event = Event(**event_data)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None  # No event with the new code
        mock_db.execute.return_value = mock_result
        
        with patch('app.events.service.get_event', return_value=event) as mock_get_event:
            # Execute
            result = await update_event(mock_db, update_event_code_input, mock_blob_service)
            
            # Assert
            mock_get_event.assert_called_once_with(mock_db, update_event_code_input.event_code)
            assert result.code == update_event_code_input.new_event_code
            assert result.name == update_event_code_input.name
            mock_db.execute.assert_called_once()  # Check for existing event with new code
            mock_db.commit.assert_called_once()
            mock_db.refresh.assert_called_once()
            
            # Assert container operations for code rename
            mock_blob_service.create_container.assert_called_once_with(
                update_event_code_input.new_event_code.lower(), public_access="blob"
            )
            
            # Check container copy and delete operations
            old_client = mock_blob_service.get_container_client.return_value
            new_client = mock_blob_service.get_container_client.return_value
            assert old_client.list_blobs.call_count == 1
            mock_blob_service.delete_container.assert_called_once_with(event_data["code"].lower())

    @pytest.mark.asyncio
    async def test_update_event_code_conflict(self, mock_db, mock_blob_service, event_data, update_event_code_input):
        # Setup mock to simulate conflict with new code
        event = Event(**event_data)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = Event(code=update_event_code_input.new_event_code)
        mock_db.execute.return_value = mock_result
        
        with patch('app.events.service.get_event', return_value=event) as mock_get_event:
            # Execute and assert
            with pytest.raises(EventAlreadyExists) as excinfo:
                await update_event(mock_db, update_event_code_input, mock_blob_service)
            
            assert update_event_code_input.new_event_code in str(excinfo.value)
            mock_get_event.assert_called_once()
            mock_db.execute.assert_called_once()
            mock_db.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_update_event_integrity_error(self, mock_db, mock_blob_service, event_data, update_event_input):
        # Setup mock
        event = Event(**event_data)
        mock_db.commit.side_effect = IntegrityError(None, None, None)
        
        with patch('app.events.service.get_event', return_value=event) as mock_get_event:
            # Execute and assert
            with pytest.raises(EventAlreadyExists) as excinfo:
                await update_event(mock_db, update_event_input, mock_blob_service)
            
            mock_get_event.assert_called_once()
            mock_db.commit.assert_called_once()
            mock_db.rollback.assert_called_once()


class TestUpsertEventImage:
    """Tests for the upsert_event_image function."""
    
    @pytest.mark.asyncio
    async def test_upsert_event_image(self, mock_db, mock_container, mock_upload_file, event_data):
        # Setup mock
        event = Event(**event_data)
        
        with patch('app.events.service.get_event', return_value=event) as mock_get_event:
            # Execute
            result = await upsert_event_image(
                mock_db, event_data["code"], mock_upload_file, mock_container
            )
            
            # Assert
            mock_get_event.assert_called_once_with(mock_db, event_data["code"])
            # Check image upload
            mock_upload_file.read.assert_called_once()
            mock_container.upload_blob.assert_called_once()
            
            # Check URL assignment and DB operations
            assert result.event_image_url == f"{mock_container.url}/assets/event_image.jpg"
            mock_db.add.assert_called_once_with(event)
            mock_db.commit.assert_called_once()
            mock_db.refresh.assert_called_once()


class TestDeleteEvent:
    """Tests for the delete_event function."""
    
    @pytest.mark.asyncio
    async def test_delete_event(self, mock_db, mock_blob_service, event_data):
        # Setup mock
        event = Event(**event_data)
        
        with patch('app.events.service.get_event', return_value=event) as mock_get_event:
            # Execute
            await delete_event(mock_db, event_data["code"], mock_blob_service)
            
            # Assert
            mock_get_event.assert_called_once_with(mock_db, event_data["code"])
            mock_db.delete.assert_called_once_with(event)
            mock_db.commit.assert_called_once()
            
            # Check container deletion
            mock_blob_service.delete_container.assert_called_once_with(event_data["code"].lower())

    @pytest.mark.asyncio
    async def test_delete_event_container_not_found(self, mock_db, mock_blob_service, event_data):
        # Setup mock with container not found error
        event = Event(**event_data)
        mock_blob_service.delete_container.side_effect = ResourceNotFoundError("Container not found")
        
        with patch('app.events.service.get_event', return_value=event) as mock_get_event:
            # Execute
            await delete_event(mock_db, event_data["code"], mock_blob_service)
            
            # Assert error was handled and DB operations still completed
            mock_get_event.assert_called_once()
            mock_db.delete.assert_called_once()
            mock_db.commit.assert_called_once()
            mock_blob_service.delete_container.assert_called_once()
