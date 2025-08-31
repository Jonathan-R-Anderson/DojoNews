from flask import Blueprint, render_template

forumBlueprint = Blueprint("forum", __name__)


@forumBlueprint.route("/forum")
def forum():
    """Render the forum board index."""
    return render_template("forum.html")
