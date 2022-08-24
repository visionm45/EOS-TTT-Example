import "./game-room.css";
import React from "react";
import ourNetwork from "../network";
import { AnchorUser } from "ual-anchor";

/** this is the table in the contract
TABLE waiting
  {
    asset funds;
    name user;
    uint64_t primary_key() const { return funds.amount; }
  };
 */
interface GameInQueue {
  funds: string;
  user: string;
}

interface State {
  games: GameInQueue[];
  waiting: Boolean;
  funds: string;
  ready: boolean;
}

interface Props {
  activeUser: null | AnchorUser;
  accountName: string;
}

class GameRoom extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {
      games: [],
      waiting: false,
      funds: "",
      ready: false,
    };
    // console.log("construct");
  }

  getOpenGames = async () => {
    // console.log("polling open games");
    let response = await this.props.activeUser.rpc.get_table_rows({
      json: true,
      code: ourNetwork.contractAcct,
      scope: ourNetwork.contractAcct,
      table: "waiting",
      reverse: false,
      show_payer: false,
    });
    let waiting = false;

    let games: GameInQueue[] = response.rows.map((game) => {
      if (game.user === this.props.accountName) {
        waiting = true;
      }
      return { funds: game.funds, user: game.user };
    });

    if (waiting !== this.state.waiting) {
      this.setState({
        waiting: waiting,
      });
      this.getTokenBalance();
    }

    this.setState({
      games: games,
    });

    if (!this.state.ready) {
      this.setState({ ready: true });
    }
  };

  getTokenBalance = async () => {
    this.props.activeUser.rpc
      .get_currency_balance(
        ourNetwork.tokenAcct,
        this.props.accountName,
        ourNetwork.tokenSymbol
      )
      .then((balance) =>
        this.setState({
          funds: balance[0],
        })
      );
  };

  //@ts-ignore
  timer: null | Timer = null;
  componentDidMount() {
    this.getOpenGames();
    this.getTokenBalance();
    if (!this.timer) {
      this.timer = setInterval(this.getOpenGames, 10000);
    }
  }

  componentWillUnmount() {
    clearInterval(this.timer);
    this.timer = null;
  }

  dequeue = async () => {
    const transaction = {
      actions: [
        {
          account: ourNetwork.contractAcct,
          name: "dequeue",
          authorization: [
            { actor: this.props.accountName, permission: "active" },
          ],
          data: {
            host: this.props.accountName,
          },
        },
      ],
    };
    try {
      await this.props.activeUser.signTransaction(transaction, {
        broadcast: true,
      });

      this.getOpenGames();
    } catch (error) {
      console.warn(error);
    }
  };

  /**
   * sends tokens to the ttt contract
   * equivilent cleos command
   * cleos -u https://jungle4.cryptolions.io:443 push action ajdioxngjdnt transfer '[ "ajdioxngjdnt", "ajdioxngjdkt", "1000.0000 {ourNetwork.tokenSymbol}", "HODLHODLHODL" ]' -p ajdioxngjdnt@active
   *
   * the contract is waiting for notification of transfer
   * [[eosio::on_notify("ajdioxngjdnt::transfer")]] void notify_transfer(name from, name to, asset quantity, string memo);
   *
   * @param quantity the asset to 4 decimal precision ex 34.0023
   */
  sendTokens = async (quantity: string) => {
    const transaction = {
      actions: [
        {
          account: ourNetwork.tokenAcct,
          name: "transfer",
          authorization: [
            { actor: this.props.accountName, permission: "active" },
          ],
          data: {
            from: this.props.accountName,
            to: ourNetwork.contractAcct,
            quantity: quantity,
            memo: "lets goooo",
          },
        },
      ],
    };
    try {
      await this.props.activeUser.signTransaction(transaction, {
        broadcast: true,
      });

      this.getOpenGames();
    } catch (error) {
      console.warn(error);
    }
  };

  //in order to start a new game tokens are sent to the ttt contract and are held there until the game has concluded or the user initiates the dequeue action
  newGame = (quantity: number) => {
    this.sendTokens(`${quantity}.0000 ${ourNetwork.tokenSymbol}`);
  };

  joinGame = (game: GameInQueue) => {
    this.sendTokens(game.funds);
  };

  render(): React.ReactNode {
    const games = this.state.games.map((game, index) => {
      return (
        <li key={index}>
          <button
            className="pure-button"
            onClick={() => {
              this.joinGame(game);
            }}
          >
            Join {game.user} : {game.funds}
          </button>
        </li>
      );
    });
    if (this.state.ready) {
      if (this.state.waiting) {
        return (
          <div>
            <h1> Searching for opponent </h1>
            <button className="pure-button" onClick={this.dequeue}>
              STOP IT!!!
            </button>
          </div>
        );
      } else {
        return (
          <div>
            <hr />
            <h2> Open Games </h2>
            <ol>{games}</ol>
            <hr />
            <h2> Start a new Game </h2>
            <div className="buttons">
              <button
                className="pure-button"
                onClick={() => {
                  this.newGame(1);
                }}
              >
                1 {ourNetwork.tokenSymbol}
              </button>
              <button
                className="pure-button"
                onClick={() => {
                  this.newGame(5);
                }}
              >
                5 {ourNetwork.tokenSymbol}
              </button>
              <button
                className="pure-button"
                onClick={() => {
                  this.newGame(10);
                }}
              >
                10 {ourNetwork.tokenSymbol}
              </button>
            </div>

            <hr />
            <h3>You have {this.state.funds}</h3>
          </div>
        );
      }
    } else {
      return <h2>Loading Please Wait ✧♡(◕‿◕✿)</h2>;
    }
  }
}

export default GameRoom;
