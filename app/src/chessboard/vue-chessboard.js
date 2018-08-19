const svg = require('svg.js');
const get = require('lodash/get');
const {
  squareToCoords,
  coordsToSquare,
  dispatchMouseEvent,
} = require('../utils');

/**
 * Chessboard implemented with Vue.JS
 * Beta in August 2018
 */
class VueChessboard {
  /**
   * Constructor
   * @param  {Element} element
   * @constructor
   */
  constructor(element) {
    this.element = element;
    this.draw = svg(this.element.id);
    this.draw.node.classList.add('ccHelper-customArrows');

    this.viewSize = this.element.clientWidth;
    this.draw.viewbox(0, 0, this.viewSize, this.viewSize);
    this.draw.group().id('board-group');
    this.arrowEnd = this.draw.marker(4, 4, function(add) {
      add.polygon('0,0 0,4 4,2').fill('orange').opacity(1);
      this.ref(0, 2); // eslint-disable-line no-invalid-this
    }).size(4, 4);

    setInterval(() => {
      const event = new Event('ccHelper-draw');
      document.dispatchEvent(event);
    }, 500);
  }

  /**
   * Return DOM element bound to the board
   * @return {Element}
   */
  getElement() {
    return this.element;
  }

  /**
   * Return DOM element for relative positioning
   * e.g. for blindfold mode
   * @return {Element}
   */
  getRelativeContainer() {
    return this.element;
  }

  /**
   * Make move
   * @param  {String} fromSq   e2
   * @param  {String} toSq e4
   */
  makeMove(fromSq, toSq) {
    const fromCoords = squareToCoords(fromSq);
    const pieceElement = this.element.querySelector(`.piece.square-${fromCoords.join('')}`);
    if (pieceElement) {
      const fromPosition = this._getSquarePosition(fromSq);
      dispatchMouseEvent(pieceElement, {
        name: 'mousedown',
        x: fromPosition.x,
        y: fromPosition.y,
      });

      const toPosition = this._getSquarePosition(toSq);
      dispatchMouseEvent(pieceElement, {
        name: 'mouseup',
        x: toPosition.x,
        y: toPosition.y,
      });
    }
  }

  /**
   * Is move legal
   * @param  {String}  fromSq e2
   * @param  {String}  toSq   e4
   * @return {Boolean}        [description]
   */
  isLegalMove(fromSq, toSq) {
    const {legalMoves} = this._getInternalVueState();
    return legalMoves.some((m) => m.from === fromSq && m.to === toSq);
  }

  /**
   * Is it players move now?
   * @return {Boolean} [description]
   */
  isPlayersMove() {
    const {playingAs, sideToMove} = this._getInternalVueState();

    if (playingAs !== undefined && sideToMove !== undefined) {
      return playingAs === sideToMove;
    }

    return true;
  }

  /**
   * Return object with all the pieces
   * @return {Object} [description]
   */
  getPiecesSetup() {
    // const pieces = {1: {color: 2, type: 'p', area: 'e2'}, };
    const piecesElements = this.element.querySelectorAll('.piece');
    const pieces = {};

    [...piecesElements].forEach((el, index) => {
      const background = el.getAttribute('style');

      const color = /b.\.png"/.test(background) ? 2 : 1;
      const type = background.match(/(.)\.png"/)[1];
      const area = coordsToSquare(el.className.match(/square-(\d+)/)[1]);

      pieces[index] = {color, type, area};
    });

    return pieces;
  }

  /**
   * Draw arrow from one point to another
   * @param  {String} fromSq e2
   * @param  {String} toSq   e4
   */
  markArrow(fromSq, toSq) {
    const lineId = `ccHelper-arrow-${fromSq}${toSq}`;

    if (svg.get(lineId)) {
      return;
    }

    const fromPosition = this._getSquarePosition(fromSq, false);
    const toPosition = this._getSquarePosition(toSq, false);

    // what if the board became bigger/smaller?
    const sizeRatio = this.element.clientWidth / this.viewSize;
    const elementWidth = this.element.clientWidth / sizeRatio;

    const compensationSize = elementWidth / 32; // half of a square
    const compensation = {
      x: {start: 0, end: 0},
      y: {start: 0, end: 0},
    };

    if (fromPosition.x < toPosition.x) {
      compensation.x.start = compensationSize;
      compensation.x.end = -compensationSize;
    } else if (fromPosition.x > toPosition.x) {
      compensation.x.start = -compensationSize;
      compensation.x.end = compensationSize;
    }

    if (fromPosition.y < toPosition.y) {
      compensation.y.start = compensationSize;
      compensation.y.end = -compensationSize;
    } else if (fromPosition.y > toPosition.y) {
      compensation.y.start = -compensationSize;
      compensation.y.end = compensationSize;
    }

    const boardGroup = svg.get('board-group');
    const line = this
      .draw
      .line(
        fromPosition.x / sizeRatio + compensation.x.start,
        fromPosition.y / sizeRatio + compensation.y.start,
        toPosition.x / sizeRatio + compensation.x.end,
        toPosition.y / sizeRatio + compensation.y.end,
      )
      .stroke({
        width: elementWidth / 55,
        color: 'orange',
        opacity: 1,
      });

    boardGroup.add(line);
    line.id(lineId);
    line.attr({
      'class': 'arrow',
      'pointer-events': 'none',
    });

    line.marker('end', this.arrowEnd);
  }

  /**
   * Remove arrow
   * @param  {String} fromSq e2
   * @param  {String} toSq   e4
   */
  unmarkArrow(fromSq, toSq) {
    const lineId = `ccHelper-arrow-${fromSq}${toSq}`;
    if (svg.get(lineId)) {
      svg.get(lineId).remove();
    }
  }

  /**
   * Remove all arrows
   */
  clearMarkedArrows() {
    const boardGroup = svg.get('board-group');
    boardGroup.each((i, item) => {
      const id = get(item, '0.node.id');
      if (id && id.startsWith('ccHelper-arrow-')) {
        svg.get(id).remove();
      }
    });
  }

  /**
   * Mark an area
   * @param  {String} square e2
   */
  markArea(square) {
    // TODO: implement
  }

  /**
   * Remove marked area
   * @param  {String} square e2
   */
  unmarkArea(square) {
    // TODO: implement
  }

  /**
   * Get position in pixels for some square
   * @param  {String}  square    in format a2
   * @param  {Boolean} fromDoc  if true, offset is made from document, otherwise from closest el
   * @return {Object}            coordinates, { x, y }
   */
  _getSquarePosition(square, fromDoc = true) {
    const isFlipped = this.element.classList.contains('flipped');
    const coords = squareToCoords(square).map((c) => Number(c));
    const {left, top, width} = this.element.getBoundingClientRect();
    const squareWidth = width / 8;
    const correction = squareWidth / 2;

    if (!isFlipped) {
      return {
        x: (fromDoc ? left : 0) + squareWidth * coords[0] - correction,
        y: (fromDoc ? top : 0) + width - squareWidth * coords[1] + correction,
      };
    } else {
      return {
        x: (fromDoc ? left : 0) + width - squareWidth * coords[0] + correction,
        y: (fromDoc ? top : 0) + squareWidth * coords[1] - correction,
      };
    }
  }

  /**
   * Get access to Vue state object
   * @return {Object}
   */
  _getInternalVueState() {
    return this.element.__vue__.chessboard.state;
  }
}

module.exports = VueChessboard;
