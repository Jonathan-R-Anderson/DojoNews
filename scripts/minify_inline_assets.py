import sys
from pathlib import Path
from bs4 import BeautifulSoup
import rcssmin
import rjsmin


def minify_file(html_path: Path) -> None:
    text = html_path.read_text(encoding='utf-8')
    soup = BeautifulSoup(text, 'html.parser')
    for style in soup.find_all('style'):
        if style.string:
            minified_css = rcssmin.cssmin(style.string)
            style.string.replace_with(minified_css)
    for script in soup.find_all('script'):
        if script.string:
            minified_js = rjsmin.jsmin(script.string)
            script.string.replace_with(minified_js)
    html_path.write_text(str(soup), encoding='utf-8')


def main(directory: Path) -> None:
    for html_file in directory.glob('*.html'):
        minify_file(html_file)
        print(f"Minified {html_file}")


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Usage: python minify_inline_assets.py <directory>')
        sys.exit(1)
    main(Path(sys.argv[1]))
