#pragma once
#include <eosio/eosio.hpp>
#include <eosio/asset.hpp>
#include <eosio/name.hpp>
#include <eosio/singleton.hpp>
#include <string>
#include <vector>

using namespace std;
using namespace eosio;

CONTRACT ttt_contract : public contract
{
  const string TOKEN_CONTRACT = "ajdioxngjdnt"; //This is the token contract account that handles the TTT tokens
  const symbol TOKEN_SYMBOL = symbol("TTT", 4); //This is the token that must be issued by the above account

public:
  ttt_contract(name receiver, name code, datastream<const char *> ds) : contract(receiver, code, ds) {}

  // Notification of transfers from token_contract --- MUST BE SET to listen for the transfer coming from the TOKEN_CONTRACT
  [[eosio::on_notify("ajdioxngjdnt::transfer")]] void notify_transfer(name from, name to, asset quantity, string memo);
  // public actions
  ACTION dequeue(const name &host);

  ACTION move(const name &host, const name &challenger, const uint8_t position);
  // "private" action clear
  ACTION clear();

private:
  void create(const name &host, const name &challenger, const asset &bet);
  void return_tokens(name who);

  int game_exists(const name &host, const name &challenger); // returns primary index if found and -1 if not found

  uint8_t check_winner(const vector<uint8_t> &board); // 0 no winner, 1 host, 2 challenger
  void game_finished(const int64_t key, const uint8_t winner);
  void adjust_rank(const name &winner, const name &loser);
  void award_pot(const name &winner, const name &loser); // sends all tokens staked to winner and removes the ttt_token entries

  TABLE game //Table for all active and ongoing games
  {
    uint64_t key; // generated by calling available_primary_key
    time_point time;
    name host;
    name challenger;
    name turn;
    name winner;  // winner currently not being used
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

  TABLE waiting // table of those waiting to find a game
  {
    asset funds;
    name user;
    uint64_t primary_key() const { return funds.amount; }
  };
  typedef multi_index<name("waiting"), waiting> waiting_table;

  TABLE ranking // wins and losses of all users
  {
    name user;
    uint64_t win = 0;
    uint64_t loss = 0;
    uint64_t primary_key() const { return user.value; }
  };
  typedef multi_index<name("rankings"), ranking> rankings_table;

  TABLE ttt_token // all of the tokens that are being held by this contract account
  {
    name user;
    asset funds;
    auto primary_key() const { return user.value; }
  };
  typedef multi_index<name("ttttoken"), ttt_token> token_table;
};