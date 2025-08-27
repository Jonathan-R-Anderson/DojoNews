from flask import render_template
from utils.log import Log


def notFoundErrorHandler(e):
    """
    This function returns a custom 404 page when a requested resource is not found.

    :param e: The exception object
    :return: A tuple containing the Jinja template for the 404 error and the status code
    """

    # Tamga expects the message argument to be a string. Passing the exception
    # object directly would raise a ``TypeError`` because ``Tamga.error`` tries
    # to concatenate the message with additional metadata. Convert the exception
    # to its string representation so the 404 error details are logged safely.
    Log.error(str(e))

    return render_template("notFound.html"), 404
