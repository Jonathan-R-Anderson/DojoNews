from flask import Blueprint, render_template

boardBlueprint = Blueprint('board', __name__)

@boardBlueprint.route('/board/<int:board_id>')
def board(board_id):
    return render_template('board.html', board_id=board_id)
