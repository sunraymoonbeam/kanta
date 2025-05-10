import os
from typing import Optional, Any
from loguru import logger
from azure.core.exceptions import ResourceExistsError
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient


def setup_blob_service_client(
    *,
    connection_string: Optional[str] = None,
    account_url: Optional[str] = None,
    credential: Optional[Any] = None,
) -> BlobServiceClient:
    """
    Instantiate a BlobServiceClient for Azure Blob Storage.

    Priority:
      1. connection_string
      2. account_url + credential
      3. account_url + DefaultAzureCredential()

    Raises:
        ValueError: if neither connection_string nor account_url is provided.
        Exception: for any underlying client initialization errors.

    Returns:
        BlobServiceClient: ready to use for container and blob operations.
    """
    try:
        # 1) Connection string takes precedence
        if connection_string:
            logger.debug("Creating BlobServiceClient from connection string.")
            return BlobServiceClient.from_connection_string(connection_string)

        # 2) Must have account_url if no connection_string
        if not account_url:
            raise ValueError(
                "Either 'connection_string' or 'account_url' must be provided"
            )

        # 3) If no explicit credential, fall back to Azure AD / Managed Identity
        if credential is None:
            logger.debug("No credential provided—using DefaultAzureCredential.")
            credential = DefaultAzureCredential()

        logger.debug(f"Creating BlobServiceClient for account_url={account_url}.")
        return BlobServiceClient(account_url=account_url, credential=credential)

    except Exception as e:
        logger.error(f"Failed to set up Azure BlobServiceClient: {e}")
        # Re-raise so callers can catch and fail fast
        raise


def upload_directory_to_container(
    directory_path: str,
    container_name: str,
    blob_service: BlobServiceClient,
    blob_prefix: str = "",
) -> bool:
    """
    Recursively upload a local directory to a blob container, preserving
    the folder structure under `blob_prefix`.

    Args:
        directory_path (str): Local folder to upload.
        container_name  (str): Name of your blob container (must exist).
        blob_service    (BlobServiceClient): from setup_blob_service_client().
        blob_prefix     (str): “folder” path in the container.

    Returns:
        bool: True if all succeed; False if any fail.
    """
    success = True
    container = blob_service.get_container_client(container_name)

    # ensure container exists
    try:
        container.create_container()
    except ResourceExistsError:
        pass

    for root, _, files in os.walk(directory_path):
        for file in files:
            local_path = os.path.join(root, file)
            # preserve subfolder structure
            rel_path = os.path.relpath(local_path, directory_path)
            blob_name = f"{blob_prefix}/{rel_path}".lstrip("/")

            try:
                with open(local_path, "rb") as data:
                    container.upload_blob(name=blob_name, data=data, overwrite=True)
                print(f"Uploaded {local_path} → {container_name}/{blob_name}")
            except Exception as e:
                print(f"Failed {local_path}: {e}")
                success = False

    return success
