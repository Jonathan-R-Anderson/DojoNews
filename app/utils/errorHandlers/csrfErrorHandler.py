from flask import render_template
from utils.log import Log


def csrfErrorHandler(e):
    """
    This function returns a custom 400 page when a CSRF token is invalid or missing.

    :param e: The exception object
    :return: A tuple containing the Jinja template for the 400 error and the status code
    """

    # Tamga expects the message argument to be a string. Passing the exception
    # object directly would raise a ``TypeError`` because ``Tamga.error`` tries
    # to concatenate the message with additional metadata. Convert the exception
    # to its string representation so the CSRF error details are logged safely.
    Log.error(str(e))

    return render_template("csrfError.html", reason=e.description), 400
