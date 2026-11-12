from decimal import ROUND_HALF_UP, Decimal
from math import asin, cos, radians, sin, sqrt

EARTH_RADIUS_KM = 6371.0088
DISTANCE_PRECISION = Decimal("0.01")


def haversine_distance_km(
    latitude_a: Decimal,
    longitude_a: Decimal,
    latitude_b: Decimal,
    longitude_b: Decimal,
) -> Decimal:
    """Great-circle distance in kilometres.

    This is the development fallback used until the Geoapify routing provider is
    configured. It is intentionally server-side: the client never supplies a
    billable distance.
    """
    lat_a = radians(float(latitude_a))
    lon_a = radians(float(longitude_a))
    lat_b = radians(float(latitude_b))
    lon_b = radians(float(longitude_b))

    delta_lat = lat_b - lat_a
    delta_lon = lon_b - lon_a
    haversine = sin(delta_lat / 2) ** 2 + cos(lat_a) * cos(lat_b) * sin(delta_lon / 2) ** 2
    distance = 2 * EARTH_RADIUS_KM * asin(sqrt(min(1.0, haversine)))
    return Decimal(str(distance)).quantize(DISTANCE_PRECISION, rounding=ROUND_HALF_UP)
