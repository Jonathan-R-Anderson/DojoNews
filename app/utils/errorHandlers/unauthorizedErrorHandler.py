from flask import render_template
from utils.log import Log


def unauthorizedErrorHandler(e):
    """
    This function returns a custom 401 page when a user tries to access a protected resource without proper authentication.

    :param e: The exception object
    :return: A tuple containing the Jinja template for the 401 error and the status code
    """

    # Tamga expects the message argument to be a string. Passing the exception
    # object directly would raise a ``TypeError`` because ``Tamga.error`` tries
    # to concatenate the message with additional metadata. Convert the exception
    # to its string representation so the 401 error details are logged safely.
    Log.error(str(e))

    return render_template("unauthorized.html"), 401
