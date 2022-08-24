import React from "react";
import ourNetwork from "../network";
import { AnchorUser } from "ual-anchor";
import GameRoom from "./game-room";
import Game from "./game";
import { GameData } from "./types";
import WinnerModal from "./winner";

/** this is the games table in the contract
 TABLE game
  {
    uint64_t key;
    name host;
    name challenger;
    name turn;
    name winner;
    asset funds;
    vector<uint8_t> board;
    uint64_t primary_key() const { return key; }
    uint64_t by_host() const { return host.value; }
    uint64_t by_challenger() const { return challenger.value; }
  };
  typedef multi_index<name("games"), game,
                      eosio::indexed_by<name("host"), eosio::const_mem_fun<game, uint64_t, &game::by_host>>,
                      eosio::indexed_by<name("challenger"), eosio::const_mem_fun<game, uint64_t, &game::by_challenger>>>
      games_table;
 */

interface State {
  inGame: Boolean;
  ready: Boolean; //false until the required info is obtained to determine if user is in a game or not
  game: GameData;
}

interface Props {
  activeUser: null | AnchorUser;
  accountName: string;
}

class Lobby extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    // console.log("constructor");
    this.state = {
      inGame: false,
      ready: false,
      game: {
        host: "",
        key: "",
        challenger: "",
        time: "",
        turn: "",
        funds: "",
        board: "",
      },
    };
  }

  componentDidMount() {
    this.polling();
    // console.log("will mount");
  }

  //@ts-ignore
  timer: null | Timer = null;
  polling = async () => {
    //let inGame = await this.isInGame();
    //console.log(inGame);
    if (/*!inGame &&*/ !this.timer) {
      this.timer = setInterval(() => {
        // console.log("polling games");
        if (this.state.inGame) {
          this.checkGame(this.state.game.key);
        } else {
          this.isInGame();
        }
      }, 5000);
    }
  };

  componentWillUnmount() {
    clearInterval(this.timer);
    this.timer = null;
    // console.log("destructor");
  }

  checkGame = async (key: string) => {
    // console.log("checkGame");
    try {
      let results = await this.props.activeUser.rpc.get_table_rows({
        json: true, // Get the response as json
        code: ourNetwork.contractAcct, // Contract that we target
        scope: ourNetwork.contractAcct, // Account that owns the data
        table: "games", // Table name
        lower_bound: key, // Table primary key value
        limit: 1, // Here we limit to 1 to get only the single row with primary key equal to 'testacc'
        reverse: false, // Optional: Get reversed data
        show_payer: false, // Optional: Show ram payer
      });

      if (
        results.rows.length &&
        (results.rows[0].host === this.state.game.host ||
          results.rows[0].challenger === this.state.game.challenger)
      ) {
        return true;
      } else {
        this.setState({
          inGame: false,
        });
        return false;
      }
    } catch (e) {
      console.log(e);
    }
  };

  /**
   * check the games table using the secondary and tertiary indexes (host/challenger)
   * set the results in the local state
   */
  isInGame = async () => {
    //console.log("polling games table");
    try {
      let results = await this.props.activeUser.rpc.get_table_rows({
        json: true, // Get the response as json
        code: ourNetwork.contractAcct, // Contract that we target
        scope: ourNetwork.contractAcct, // Account that owns the data
        table: "games", // Table name
        index_position: 2, // Table secondary index
        lower_bound: this.props.accountName, // Table secondary key value
        key_type: "name",
        limit: 1, // Here we limit to 1 to get only row
        reverse: false, // Optional: Get reversed data
        show_payer: false, // Optional: Show ram payer
      });
      //console.log(results.rows);
      //console.log(this.props.accountName);
      if (
        results.rows.length === 0 ||
        (results.rows[0].host !== this.props.accountName &&
          results.rows[0].challenger !== this.props.accountName)
      ) {
        results = await this.props.activeUser.rpc.get_table_rows({
          json: true, // Get the response as json
          code: ourNetwork.contractAcct, // Contract that we target
          scope: ourNetwork.contractAcct, // Account that owns the data
          table: "games", // Table name
          index_position: 3, // Table tertiary index
          lower_bound: this.props.accountName, // Table secondary key value
          key_type: "name",
          limit: 1, // Here we limit to 1 to get only row
          reverse: false, // Optional: Get reversed data
          show_payer: false, // Optional: Show ram payer
        });
      }

      if (
        results.rows.length &&
        (results.rows[0].host === this.props.accountName ||
          results.rows[0].challenger === this.props.accountName)
      ) {
        this.setState({
          inGame: true,
          ready: true,
          game: {
            host: results.rows[0].host,
            challenger: results.rows[0].challenger,
            turn: results.rows[0].turn,
            funds: results.rows[0].funds,
            board: results.rows[0].board,
            time: results.rows[0].time,
            key: results.rows[0].key,
          },
        });
        return true;
      }

      this.setState({
        inGame: false,
        ready: true,
      });
      return false;
    } catch (error) {
      console.log(error);
    }
  };

  render(): React.ReactNode {
    // console.log("renderlobby");
    return (
      <div>
        <WinnerModal></WinnerModal>

        {this.state.ready && this.state.inGame && (
          <Game
            game={this.state.game}
            accountName={this.props.accountName}
            activeUser={this.props.activeUser}
          ></Game>
        )}

        {this.state.ready && !this.state.inGame && (
          <GameRoom {...this.props}></GameRoom>
        )}

        {!this.state.ready && <h2>Loading Please Wait ✧♡(◕‿◕✿)</h2>}
      </div>
    );
  }
}

export default Lobby;
