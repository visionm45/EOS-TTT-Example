import React from "react";
import { MouseEventHandler } from "react";
import "./ttt.css";

function Square(props: { onClick: MouseEventHandler; value: string }) {
  return (
    <button className="square" onClick={props.onClick}>
      {props.value}
    </button>
  );
}

class TTT extends React.Component<
  { squares: string[]; onClick: Function },
  {}
> {
  renderSquare(i: number) {
    return (
      <Square
        value={this.props.squares[i]}
        onClick={() => this.props.onClick(i)}
      />
    );
  }

  render() {
    return (
      <div>
        <div className="board-row">
          {this.renderSquare(0)}
          {this.renderSquare(1)}
          {this.renderSquare(2)}
        </div>
        <div className="board-row">
          {this.renderSquare(3)}
          {this.renderSquare(4)}
          {this.renderSquare(5)}
        </div>
        <div className="board-row">
          {this.renderSquare(6)}
          {this.renderSquare(7)}
          {this.renderSquare(8)}
        </div>
      </div>
    );
  }
}

export default TTT;
