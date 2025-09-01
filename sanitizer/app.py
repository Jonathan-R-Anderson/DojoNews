import os, re, unicodedata, json, logging
import yaml
import httpx
import regex as regx
from typing import Any, Dict, Tuple, Iterable
from fastapi import FastAPI, Request, Response, HTTPException, UploadFile
from fastapi.responses import JSONResponse, PlainTextResponse
from starlette.datastructures import FormData

import bleach
from pydantic import BaseModel, EmailStr, ValidationError

LOG_FILE = os.environ.get("LOG_FILE", "/logs/sanitizer.log")
logging.basicConfig(
    level=logging.INFO,
    handlers=[logging.FileHandler(LOG_FILE), logging.StreamHandler()]
)
logger = logging.getLogger("sanitizer")

UPSTREAM = os.getenv("UPSTREAM_URL", "http://yourapp:8000")
CONFIG_PATH = os.getenv("SANITIZER_CONFIG", "/etc/gatekeeper/config.yml")

# --- Load config ---
if os.path.exists(CONFIG_PATH):
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        CFG = yaml.safe_load(f) or {}
else:
    CFG = {}

DEFAULTS = CFG.get("default", {}) or {}
FIELD_RULES: Dict[str, dict] = CFG.get("fields", {}) or {}

# Pre-compile generic suspicious patterns (lightweight heuristics)
SUSPECT_PATTERNS = [
    re.compile(r"(?i)\bunion\s+all?\s+select\b"),
    re.compile(r"(?i)\b(select|insert|update|delete|drop|alter)\b\s+"),
    re.compile(r"(?i)<\s*script\b"),
    re.compile(r"(?i)javascript:"),
    re.compile(r"(?i)on\w+\s*="),
]

HOP_BY_HOP = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade", "content-length", "host"
}

def is_suspect(text: str) -> bool:
    for pat in SUSPECT_PATTERNS:
        if pat.search(text):
            return True
    return False

def normalize_text(s: str, trim: bool, collapse: bool) -> str:
    s = unicodedata.normalize("NFKC", s)
    # Drop common zero-width and control chars
    s = s.replace("\u200b", "").replace("\u200c", "").replace("\u200d", "").replace("\ufeff", "")
    s = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", s)
    if trim:
        s = s.strip()
    if collapse:
        s = re.sub(r"\s{2,}", " ", s)
    return s

def clean_html(s: str, allowed_tags: Iterable[str] = None, allowed_attrs: Dict[str, Iterable[str]] = None) -> str:
    allowed_tags = list(allowed_tags or [])
    allowed_attrs = dict(allowed_attrs or {})
    cleaned = bleach.clean(
        s,
        tags=allowed_tags,
        attributes=allowed_attrs,
        protocols=["http", "https", "mailto"],
        strip=True,
        strip_comments=True,
    )
    return cleaned

class EmailBox(BaseModel):
    value: EmailStr

def sanitize_field(name: str, value: Any) -> Any:
    """Apply field-specific or default rules to a single value."""
    rules = FIELD_RULES.get(name, {})
    allow_html = bool(rules.get("allow_html", DEFAULTS.get("allow_html", False)))
    max_length = int(rules.get("max_length", DEFAULTS.get("max_length", 5000)))
    trim_ws = bool(rules.get("trim_whitespace", DEFAULTS.get("trim_whitespace", True)))
    collapse_spaces = bool(rules.get("collapse_spaces", DEFAULTS.get("collapse_spaces", True)))
    pattern = rules.get("pattern")
    type_spec = rules.get("type")

    if isinstance(value, str):
        original = value
        value = normalize_text(value, trim_ws, collapse_spaces)
        if allow_html:
            value = clean_html(value, rules.get("allowed_tags"), rules.get("allowed_attrs"))
        else:
            # If HTML not allowed, strip tags safely by letting bleach remove them
            value = clean_html(value, [], {})
        # Enforce max length
        if len(value) > max_length:
            value = value[:max_length]
        # Optional type/format checks
        if type_spec == "email":
            try:
                value = EmailBox(value=value).value
            except ValidationError:
                raise HTTPException(status_code=400, detail=f"Invalid email format for field '{name}'")
        if pattern:
            if not regx.match(pattern, value):
                raise HTTPException(status_code=400, detail=f"Field '{name}' failed pattern validation")
        return value

    # Recurse through containers
    if isinstance(value, list):
        return [sanitize_field(name, v) for v in value]
    if isinstance(value, dict):
        return {k: sanitize_field(k, v) for k, v in value.items()}
    # Primitive (int/float/bool/None) pass-through
    return value

def sanitize_dict(d: Dict[str, Any]) -> Dict[str, Any]:
    out = {}
    for k, v in d.items():
        out[k] = sanitize_field(k, v)
    # Final suspect sweep on all strings (optional reject)
    if DEFAULTS.get("block_on_suspect", True):
        flat_strings = []
        def gather(x):
            if isinstance(x, str):
                flat_strings.append(x)
            elif isinstance(x, dict):
                for vv in x.values(): gather(vv)
            elif isinstance(x, list):
                for vv in x: gather(vv)
        gather(out)
        joined = " ".join(flat_strings)[:20000]
        if joined and is_suspect(joined):
            raise HTTPException(status_code=400, detail="Payload rejected: suspicious content detected")
    return out

def filter_resp_headers(headers: Dict[str, str]) -> Dict[str, str]:
    filtered = {}
    for k, v in headers.items():
        lk = k.lower()
        if lk not in HOP_BY_HOP:
            filtered[k] = v
    return filtered

app = FastAPI(title="Sanitizer Proxy", version="1.0")

@app.api_route("/{full_path:path}", methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"])
async def proxy(full_path: str, request: Request):
    method = request.method
    upstream_url = f"{UPSTREAM.rstrip('/')}/{full_path}"
    headers = {k: v for k, v in request.headers.items() if k.lower() not in HOP_BY_HOP}

    # Determine content type and sanitize accordingly
    ctype = request.headers.get("content-type", "")
    send_kwargs = {}

    try:
        if method in ("POST", "PUT", "PATCH"):
            if "application/json" in ctype:
                payload = await request.json()
                if not isinstance(payload, dict):
                    raise HTTPException(status_code=400, detail="JSON payload must be an object")
                sanitized = sanitize_dict(payload)
                send_kwargs["json"] = sanitized
                headers.pop("content-type", None)  # let httpx set it
            elif "application/x-www-form-urlencoded" in ctype:
                form: FormData = await request.form()
                data = {k: v for k, v in form.multi_items()}
                # sanitize string values only
                sanitized = {k: sanitize_field(k, v) if isinstance(v, str) else v for k, v in data.items()}
                send_kwargs["data"] = sanitized
                headers.pop("content-type", None)
            elif "multipart/form-data" in ctype:
                form: FormData = await request.form()
                data = {}
                files = []
                for k, v in form.multi_items():
                    if isinstance(v, UploadFile):
                        # Allow-list basic file types; block anything too exotic by MIME
                        mime = v.content_type or "application/octet-stream"
                        if not re.match(r"^(image/|application/pdf|text/plain)", mime):
                            raise HTTPException(status_code=400, detail=f"Blocked file type for field '{k}'")
                        files.append((k, (v.filename, await v.read(), mime)))
                    else:
                        data[k] = sanitize_field(k, str(v))
                send_kwargs["data"] = data
                send_kwargs["files"] = files if files else None
                headers.pop("content-type", None)
            else:
                # Treat as opaque body; (optionally) reject writes of unknown types
                raw = await request.body()
                if DEFAULTS.get("block_on_suspect", True) and is_suspect(raw.decode("utf-8", "ignore")):
                    raise HTTPException(status_code=400, detail="Payload rejected: suspicious content")
                send_kwargs["content"] = raw
        else:
            # For GET/DELETE/etc, we do not rewrite body
            pass

        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
            resp = await client.request(
                method,
                upstream_url,
                params=dict(request.query_params),
                headers=headers,
                **send_kwargs,
            )
        return Response(content=resp.content, status_code=resp.status_code, headers=filter_resp_headers(resp.headers))
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"detail": e.detail})
    except Exception as e:
        logger.exception("Sanitizer error")
        return JSONResponse(status_code=500, content={"detail": "Sanitizer internal error"})
