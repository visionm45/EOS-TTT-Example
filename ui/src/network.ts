// This is the network configuration

const ourNetwork = {
  chainId: "73e4385a2708e6d7048834fbc1079f2fabb17b3c125b146af438971e90716c4d", //The ID of the chain that you are running on
  contractAcct: "ajdioxngjdkt", //The TTT contract account
  tokenAcct: "ajdioxngjdnt", //The TTT token contract account
  tokenSymbol: "TTT", //The symbol used by the TTT acount
  rpcEndpoints: [
    { protocol: "https", host: "jungle4.cryptolions.io", port: 443 }, //blockchain rpc endpoint
  ],
};

export default ourNetwork;
