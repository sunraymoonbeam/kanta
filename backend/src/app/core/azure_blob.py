# backend/src/app/core/azure_blob.py

from functools import lru_cache
from typing import Any, Optional

from azure.core.exceptions import ResourceExistsError
from azure.identity import DefaultAzureCredential

# from azure.storage.blob import BlobServiceClient, ContainerClient
# Ren Hwa: IMPORTANT CHANGE here: import from azure.storage.blob.aio, not the sync version
from azure.storage.blob.aio import BlobServiceClient, ContainerClient
from fastapi import Depends, Path
from loguru import logger

from .config import get_settings

settings = get_settings()


def setup_blob_service_client(
    *,
    connection_string: Optional[str] = None,
    account_url: Optional[str] = None,
    credential: Optional[Any] = None,
) -> BlobServiceClient:
    """
    Instantiate a BlobServiceClient for Azure Blob Storage.
    """
    if connection_string:
        return BlobServiceClient.from_connection_string(connection_string)

    if not account_url:
        raise ValueError("Provide either connection_string or account_url")

    if credential is None:
        credential = DefaultAzureCredential()

    return BlobServiceClient(account_url=account_url, credential=credential)


# global singleton
_blob_client = setup_blob_service_client(
    connection_string=settings.AZURE_STORAGE_CONNECTION_STRING,
    account_url=settings.AZURE_ACCOUNT_URL,
)


@lru_cache(maxsize=1)
def get_blob_service() -> BlobServiceClient:
    """
    Dependency to retrieve the BlobServiceClient.
    """
    return _blob_client


# apparantely LRU cache makes asynchronous calls fail and returns a sync client
async def get_event_container(
    event_code: str = Path(
        ...,
        description="Event code; also used as Azure container name",
        pattern=r"^[a-zA-Z0-9_]+$",
    ),
    blob_service: BlobServiceClient = Depends(get_blob_service),
) -> ContainerClient:
    """
    Dependency that returns a ContainerClient for *this* event.
    If the container doesn’t exist, we create it.
    """
    # normalize container names to lowercase
    container_name = event_code.lower()
    container = blob_service.get_container_client(container_name)
    try:
        await container.create_container(public_access="blob")  # public access to blobs
        logger.info(f"Created new container: {container_name}")
    except ResourceExistsError:
        pass
    return container
