/*
  Import and implement UAL plugins, consumer, and wrapper in this file
*/

import Login from "./components/login";
import { UALProvider, withUAL } from "ual-reactjs-renderer";
import { Anchor } from "ual-anchor";
import { JsonRpc } from "eosjs";
import ourNetwork from "./network";

const anchor = new Anchor([ourNetwork], {
  appName: "TTT",
  rpc: new JsonRpc(
    `${ourNetwork.rpcEndpoints[0].protocol}://${ourNetwork.rpcEndpoints[0].host}:${ourNetwork.rpcEndpoints[0].port}`
  ),
  service: "https://cb.anchor.link",
  disableGreymassFuel: false,
  requestStatus: false,
});
const MyAppConsumer = withUAL(Login);

function App() {
  return (
    <UALProvider
      chains={[ourNetwork]}
      authenticators={[anchor]}
      appName={"TTT"}
    >
      <MyAppConsumer />
    </UALProvider>
  );
}

export default App;
