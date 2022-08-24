/*
this component handles interacting with the wallet
 */
import "purecss/build/pure.css";
import React from "react";
import Lobby from "./lobby";
import { AnchorUser } from "ual-anchor";
import ourNetwork from "../network";

interface State {
  activeUser: null | AnchorUser;
  accountName: string;
  ranking: string;
}

const defaultState: State = {
  activeUser: null, //to store user object from UAL
  accountName: "", //to store account name of logged in wallet user
  ranking: "",
};

class Login extends React.Component<any, State> {
  static displayName = "Login";

  constructor(props) {
    super(props);
    this.state = {
      ...defaultState,
    };
    this.updateAccountName = this.updateAccountName.bind(this);
    this.renderModalButton = this.renderModalButton.bind(this);
  }

  componentDidUpdate() {
    this.updateAccountName();
  }

  //@ts-ignore
  pollingID: Timer;
  componentDidMount(): void {
    if (!this.pollingID) {
      this.pollingID = setInterval(() => {
        if (this.state.accountName) this.getRank(this.state.accountName);
      }, 10000);
    }
  }

  getRank = async (name: string) => {
    try {
      let rankings = await this.state.activeUser.rpc.get_table_rows({
        json: true, // Get the response as json
        code: ourNetwork.contractAcct, // Contract that we target
        scope: ourNetwork.contractAcct, // Account that owns the data
        table: "rankings", // Table name
        lower_bound: name, // Table primary key value
        limit: 1, // Here we limit to 1 to get only the single row with primary key equal to 'testacc'
        reverse: false, // Optional: Get reversed data
        show_payer: false, // Optional: Show ram payer
      });
      if (rankings.rows.length) {
        if (rankings.rows[0].user === this.state.accountName) {
          this.setState({
            ranking: `Wins: ${rankings.rows[0].win} Losses: ${rankings.rows[0].loss}`,
          });
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  async updateAccountName() {
    const {
      ual: { activeUser },
    } = this.props;

    if (activeUser) {
      let newName = await activeUser.getAccountName();

      if (this.state.accountName !== newName)
        if (activeUser && !this.state.activeUser) {
          this.setState({
            activeUser: activeUser,
            accountName: newName,
          });
        }
    } else if (this.state.activeUser) {
      this.setState(defaultState);
    }
  }

  renderLogoutBtn = () => {
    const {
      ual: { activeUser, activeAuthenticator, logout },
    } = this.props;
    if (!!activeUser && !!activeAuthenticator) {
      return (
        <p>
          <button className="pure-button" onClick={logout}>
            {"Logout"}
          </button>
        </p>
      );
    }
  };

  renderModalButton() {
    return (
      <p>
        <button className="pure-button" onClick={this.props.ual.showModal}>
          Connect to Wallet
        </button>
      </p>
    );
  }

  render() {
    // console.log("render login");

    if (this.state.accountName) {
      return (
        <div style={{ textAlign: "center" }}>
          <h1>Lets Play TTT</h1>
          <Lobby {...this.state}></Lobby>
          <h3>Logged in as {this.state.accountName}</h3>
          <h4>{this.state.ranking}</h4>
          {this.renderLogoutBtn()}
        </div>
      );
    } else {
      return (
        <div>
          <h2>Lets Play TTT</h2>
          <div>Log in NOW!!!</div>
          {this.renderModalButton()}
        </div>
      );
    }
  }
}

export default Login;
