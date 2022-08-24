import "./game.css";
import React, { MouseEventHandler } from "react";
import { JsonRpc } from "@proton/hyperion";
import fetch from "isomorphic-fetch";
import ourNetwork from "../network";
import { AnchorUser } from "ual-anchor";
import { GameData, ActionMove, GameOverEvent } from "./types";
import TTT from "./ttt";

const endpoint = `${ourNetwork.rpcEndpoints[0].protocol}://${ourNetwork.rpcEndpoints[0].host}:${ourNetwork.rpcEndpoints[0].port}`;

//@ts-ignore
const rpc = new JsonRpc(endpoint, { fetch });

interface Props {
  game: GameData;
  accountName: string;
  activeUser: AnchorUser;
}

interface State {
  history: Array<{ squares: string[] }>;
  stepNumber: number;
}

class Game extends React.Component<Props, State> {
  xIsNext: boolean;
  lastActionTime: string;
  lastMove: string; //who made the last move
  loaded = false;
  constructor(props: Props) {
    super(props);

    // console.log("construct");
    this.state = {
      history: [
        {
          squares: Array(9).fill(""),
        },
      ],
      stepNumber: 0,
    };
    this.lastActionTime = props.game.time;
    this.lastMove = props.game.challenger;
    this.xIsNext = true;
  }

  timerID: number;
  componentDidMount(): void {
    if (!this.loaded) {
      this.loaded = true;
      // console.log("willmount");
      this.setState(
        {
          history: [
            {
              squares: Array(9).fill(""),
            },
          ],
        },
        this.getActions
      );
    }
    //@ts-ignore
    this.timerID = setInterval(this.getActions, 1000);
  }

  componentWillUnmount(): void {
    // console.log("will umount");
    clearInterval(this.timerID);

    this.getActions();
  }

  getActions = async () => {
    // console.log("getactions");
    let date = this.lastActionTime;
    const hostActions = await rpc.get_actions(this.props.game.host, {
      "act.account": ourNetwork.contractAcct,
      "act.name": "move",
      after: date,
    });

    const challengerActions = await rpc.get_actions(
      this.props.game.challenger,
      {
        "act.account": ourNetwork.contractAcct,
        "act.name": "move",
        after: date,
      }
    );

    const totalActions =
      hostActions.actions.length + challengerActions.actions.length;
    if (totalActions >= 2) {
      let actions: ActionMove[] = hostActions.actions.concat(
        challengerActions.actions
      ) as ActionMove[];
      actions.sort(function (x, y) {
        //@ts-ignore
        return new Date(x.timestamp) - new Date(y.timestamp);
      });
      this.handleAction(actions);
    } else if (totalActions === 1) {
      let newAction = hostActions.actions.length
        ? (hostActions.actions as ActionMove[])
        : (challengerActions.actions as ActionMove[]);
      // console.log(newAction[0]);
      this.handleAction([newAction.pop()]);
    }

    const history = this.state.history;
    const current = history[this.state.stepNumber];
    const winner = calculateWinner(current.squares);

    if (winner) {
      document.dispatchEvent(
        new CustomEvent("GameOverEvent", {
          detail: {
            winner: winner,
            game: current.squares,
          },
        }) as GameOverEvent
      );
    }
  };

  handleAction(actions: ActionMove[]) {
    let lastTime: string;

    if (actions.length > 1) {
      let moves: number[] = [];

      actions.forEach((a, i) => {
        moves[i] = a.act.data.payload.position;
      });
      this.batchSetPiece(moves);

      lastTime = actions[actions.length - 1].timestamp;
      this.lastMove = actions[actions.length - 1].act.authorization[0].actor;
    } else {
      this.setPiece(actions[0].act.data.payload.position);
      lastTime = actions[0].timestamp;
      this.lastMove = actions[0].act.authorization[0].actor;
    }

    let timestamp = lastTime.slice(0, lastTime.length - 1) + "1";
    this.lastActionTime = timestamp;
  }

  batchSetPiece(i: number[]) {
    let history = this.state.history.slice();
    let xIsNext = (this.state.history.length - 1) % 2 === 0;
    // console.log(i);
    i.forEach((n) => {
      let squares = history[history.length - 1].squares.slice();

      squares[n] = xIsNext ? "X" : "O";
      xIsNext = !xIsNext;

      // console.log(squares);
      history.push({ squares: squares });
      // console.log(history);
    });
    // console.log("history", history);
    this.setState({
      history: history,
      stepNumber: history.length - 1,
    });
    this.xIsNext = xIsNext;
  }

  setPiece(i: number) {
    let squares =
      this.state.history[this.state.history.length - 1].squares.slice();
    if (!squares[i]) {
      let xIsNext = (this.state.history.length - 1) % 2 === 0;
      squares[i] = xIsNext ? "X" : "O";

      this.setState({
        history: this.state.history.concat([{ squares: squares }]),
        stepNumber: this.state.history.length,
      });
      this.xIsNext = !xIsNext;
    }
  }

  isMyTurn(): boolean {
    if (this.props.accountName === this.lastMove) {
      return false;
    } else {
      return true;
    }
  }

  sendMove = async (i: number) => {
    const transaction = {
      actions: [
        {
          account: ourNetwork.contractAcct,
          name: "move",
          authorization: [
            { actor: this.props.accountName, permission: "active" },
          ],
          data: {
            host: this.props.game.host,
            challenger: this.props.game.challenger,
            position: i,
          },
        },
      ],
    };
    try {
      // console.log(transaction);
      await this.props.activeUser.signTransaction(transaction, {
        broadcast: true,
      });
    } catch (error) {
      // console.warn(error);
    }
  };
  handleClick(i: number) {
    if (this.state.stepNumber === this.state.history.length - 1) {
      if (
        this.isMyTurn() &&
        this.state.history[this.state.history.length - 1].squares[i] === ""
      ) {
        this.sendMove(i);
      }
    } else {
      this.setState({
        stepNumber: this.state.history.length - 1,
      });
      this.xIsNext = (this.state.history.length - 1) % 2 === 0;
    }
  }

  jumpTo(step: number) {
    if (step >= 0 && step < this.state.history.length) {
      this.setState({
        stepNumber: step,
      });
      this.xIsNext = step % 2 === 0;
    }
  }

  render() {
    const history = this.state.history;
    const current = history[this.state.stepNumber];
    const winner = calculateWinner(current.squares);

    let status: string;
    if (winner) {
      status = "Winner: " + winner;
      // alert(status);
    } else {
      status = "Next player: " + (this.xIsNext ? "X" : "O");
    }

    return (
      <div className="game">
        <div className="game-board">
          <TTT squares={current.squares} onClick={(i) => this.handleClick(i)} />
        </div>
        <div className="game-info">
          <h3>{status}</h3>

          <button
            className="pure-button"
            onClick={() => {
              this.jumpTo(this.state.stepNumber - 1);
            }}
          >
            ❮
          </button>
          <button
            className="pure-button"
            onClick={() => {
              this.jumpTo(this.state.stepNumber + 1);
            }}
          >
            ❯
          </button>
        </div>
      </div>
    );
  }
}

let calculateWinner = (squares: string[]): string => {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }

  let winner = "Cat";
  squares.forEach((s) => {
    if (!s) winner = "";
  });

  return winner;
};

export default Game;
