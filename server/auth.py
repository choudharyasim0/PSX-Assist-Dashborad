import base64
import binascii
import hmac


def is_authorized(header, password):
    if not password:
        return True
    if not header.startswith("Basic "):
        return False
    try:
        decoded = base64.b64decode(header[6:], validate=True).decode("utf-8")
    except (binascii.Error, UnicodeDecodeError, ValueError):
        return False
    _, separator, supplied_password = decoded.partition(":")
    return bool(separator) and hmac.compare_digest(
        supplied_password.encode(), password.encode()
    )
