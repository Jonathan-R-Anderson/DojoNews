"""
This file contains class that are used to create CreatePostForm for the application.
"""

from wtforms import (
    FileField,
    Form,
    SelectField,
    StringField,
    TextAreaField,
    validators,
)


class CreatePostForm(Form):
    """
    This class creates a form for creating a post.
    """

    postTitle = StringField(
        "Post Title",
        [validators.Length(min=4, max=75), validators.InputRequired()],
    )

    postTags = StringField(
        "Post Tags",
        [validators.InputRequired()],
    )

    postAbstract = TextAreaField(
        "Post Abstract",
        [validators.Length(min=150, max=200), validators.InputRequired()],
    )

    authorInfo = TextAreaField(
        "Author Info",
        [validators.Optional(), validators.Length(max=200)],
    )

    postContent = TextAreaField(
        "Post Content",
        [validators.Length(min=50)],
    )

    postBanner = FileField("Post Banner")

    postCategory = SelectField(
        "Post Category",
        [validators.Optional()],
        choices=[],
    )

    newCategory = StringField("New Category", [validators.Optional(), validators.Length(max=50)])
