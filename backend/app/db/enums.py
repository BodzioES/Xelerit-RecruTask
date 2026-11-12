from enum import StrEnum


class UserRole(StrEnum):
    CUSTOMER = "customer"
    PROVIDER = "provider"


class EmployeeRole(StrEnum):
    DRIVER = "driver"
    MOVER = "mover"


class ServiceType(StrEnum):
    SELF_DRIVE = "self_drive"
    VAN_DRIVER = "van_driver"
    FULL_MOVING = "full_moving"


class BookingStatus(StrEnum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    READY_FOR_PICKUP = "ready_for_pickup"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class LocationType(StrEnum):
    PICKUP = "pickup"
    RETURN = "return"
    LOADING = "loading"
    UNLOADING = "unloading"


class PropertyType(StrEnum):
    APARTMENT = "apartment"
    HOUSE = "house"
    OFFICE = "office"
    WAREHOUSE = "warehouse"
    HALL = "hall"
    RETAIL = "retail"
    OTHER = "other"


class BookingActor(StrEnum):
    PROVIDER = "provider"
    CUSTOMER = "customer"
    SYSTEM = "system"
