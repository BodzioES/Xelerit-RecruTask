from decimal import ROUND_HALF_UP, Decimal

CENTS = Decimal("0.01")
ZERO = Decimal("0.00")


def money(value: Decimal) -> Decimal:
    """Round a monetary amount to grosze with commercial rounding."""
    return value.quantize(CENTS, rounding=ROUND_HALF_UP)
