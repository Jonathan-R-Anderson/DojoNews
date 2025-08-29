"""Utilities for safely rendering user supplied Markdown.

This module converts Markdown input to HTML while stripping any tags or
attributes that could lead to cross site scripting (XSS) vulnerabilities.
Only basic Markdown-generated HTML is allowed and any embedded code is
presented inside ``<pre><code>`` blocks so it cannot be executed by the
browser.
"""

from markdown2 import Markdown
import bleach
from markupsafe import Markup


class SafeMarkdownRenderer:
    def __init__(self):
        # HTML tags and attributes that are considered safe and commonly
        # produced by Markdown syntax. Anything outside this list will be
        # stripped from the rendered output.
        self.allowed_tags = [
            "p",
            "br",
            "strong",
            "em",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "ul",
            "ol",
            "li",
            "blockquote",
            "code",
            "pre",
            "a",
            "img",
            "hr",
            "table",
            "thead",
            "tbody",
            "tr",
            "th",
            "td",
            "del",
            "s",
            "ins",
            "sub",
            "sup",
            "video",
            "source",
            "iframe",
        ]
        self.allowed_attributes = {
            "a": ["href", "title"],
            "img": ["src", "alt", "title", "width", "height"],
            "video": ["src", "controls", "width", "height", "poster"],
            "source": ["src", "type"],
            "iframe": ["src", "width", "height", "allow", "allowfullscreen"],
        }
        self.allowed_protocols = ["http", "https", "mailto", "magnet"]
        # Escape any raw HTML before conversion to ensure only Markdown is
        # processed. Fenced code blocks are supported so code is always
        # wrapped in <pre><code> blocks.
        self.md = Markdown(
            extras=[
                "fenced-code-blocks",
                "strike",
                "tables",
                "task_list",
                "code-friendly",
                "footnotes",
                "header-ids",
                "spoiler",
            ],
            safe_mode="escape",
        )

    def render(self, text: str) -> Markup:
        """Render Markdown into sanitized HTML safe for embedding.

        Any disallowed tags or attributes are stripped and comments are removed
        to prevent script execution. The returned value is marked as safe for
        Jinja templates.
        """
        html = self.md.convert(text or "")
        clean_html = bleach.clean(
            html,
            tags=self.allowed_tags,
            attributes=self.allowed_attributes,
            protocols=self.allowed_protocols,
            strip=True,
            strip_comments=True,
        )
        return Markup(clean_html)
