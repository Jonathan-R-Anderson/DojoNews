import os
import clamd


def scan_file(path: str) -> None:
    """Scan ``path`` using ClamAV and raise ``RuntimeError`` if infected.

    Parameters
    ----------
    path: str
        Filesystem path to the file that should be scanned.
    """
    host = os.environ.get("CLAMAV_HOST", "clamav")
    port = int(os.environ.get("CLAMAV_PORT", "3310"))
    try:
        cd = clamd.ClamdNetworkSocket(host=host, port=port)
        with open(path, "rb") as fh:
            result = cd.instream(fh)
    except Exception as exc:  # pragma: no cover - network issues
        raise RuntimeError(f"clamav scan failed: {exc}") from exc

    status = result.get("stream", ("ERROR", ""))[0]
    if status != "OK":
        raise RuntimeError("file failed virus scan")
