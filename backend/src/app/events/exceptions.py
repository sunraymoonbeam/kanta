class EventAlreadyExists(Exception):
    def __init__(self, code: str):
        super().__init__(f"Event code '{code}' already exists")


class EventNotFound(Exception):
    def __init__(self, code: str):
        super().__init__(f"Event with code '{code}' not found")
