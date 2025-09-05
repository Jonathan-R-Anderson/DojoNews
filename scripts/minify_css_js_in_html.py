#!/usr/bin/env python3
import re, sys, pathlib

def minify_css(css: str) -> str:
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.DOTALL)  # remove CSS comments
    css = re.sub(r"\s+", " ", css)
    css = re.sub(r"\s*([{};:,])\s*", r"\1", css)
    return css.strip()

def minify_js(js: str) -> str:
    js = re.sub(r"//.*", "", js)  # remove single-line comments
    js = re.sub(r"/\*.*?\*/", "", js, flags=re.DOTALL)  # remove block comments
    js = re.sub(r"\s+", " ", js)
    js = re.sub(r"\s*([{};:,\(\)=\+\-])\s*", r"\1", js)
    return js.strip()

def process_file(path: pathlib.Path) -> None:
    text = path.read_text()
    # remove HTML comments
    text = re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)
    # minify CSS blocks
    def repl_css(m):
        return m.group(1) + minify_css(m.group(2)) + m.group(3)
    text = re.sub(r"(<style[^>]*>)(.*?)(</style>)", repl_css, text, flags=re.DOTALL)
    # minify JS blocks
    def repl_js(m):
        return m.group(1) + minify_js(m.group(2)) + m.group(3)
    text = re.sub(r"(<script[^>]*>)(.*?)(</script>)", repl_js, text, flags=re.DOTALL)
    path.write_text(text)

if __name__ == "__main__":
    for filename in sys.argv[1:]:
        process_file(pathlib.Path(filename))
