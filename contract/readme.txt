This contract requires a token contract account to issue tokens. I reccommend using the symbol "TTT".  
The account used to manage the token needs to be set in include/ttt.hpp



const string TOKEN_CONTRACT = "ajdioxngjdnt"; //This is the token contract account that handles the TTT tokens
const symbol TOKEN_SYMBOL = symbol("TTT", 4); //This is the token that must be issued by the above account


and here


// Notification of transfers from token_contract --- MUST BE SET to listen for the transfer coming from the TOKEN_CONTRACT
[[eosio::on_notify("ajdioxngjdnt::transfer")]] void notify_transfer(name from, name to, asset quantity, string memo);



**************************************************************************************************************************************************

The contract works by sending any amount of token to the contract account. Upon receipt the contract puts 
	the player on the waiting table or if another player has already staked the same amount of token a game is created.

Players alternate, starting with whoever first staked tokens in the game, sending moves to the contract 
	account until a game has finished.  If the cat wins then tokens are returned to both players. 
	If either player wins then that player receives all of the tokens and the win/loss is recorded in the rankings table. 


I could not figure out how to generate ricardian contracts so that does not happen right now... would be good to get that working as an example.