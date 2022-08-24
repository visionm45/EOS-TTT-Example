#include <ttt.hpp>

/*
Add a token pot mechanic, where:

the host stakes tokens to start a game,
the opponent must stake an equal amount in order to accept a game, and
the winner takes the pot.
If the host calls the dequeue action before the opponent accepts, or if the game ends in a tie, refund the player(s).
*/

// ******************************************************************************************************************************* //
// ******************************************************************************************************************************* //
// ***************************************************** Public Actions ********************************************************** //
// ******************************************************************************************************************************* //
// ******************************************************************************************************************************* //

/*
  The "host" stakes TTT tokens to initiate a game
  The host is recorded on the waiting table
  and the assets are recorded in the ttt_token table

  if the host is already has TTT tokens staked then the current deposit is rejected
*/
void ttt_contract::notify_transfer(name from, name to, asset quantity, string memo)
{
  if (to == get_self() && from != get_self())
  {
    check(quantity.amount > 0, "no negative");
    check(quantity.symbol == TOKEN_SYMBOL, "wrong symbol");
    const name payer = get_self();
    // Init the _token table
    token_table _token(payer, payer.value);

    // Look for an existing user record from _token table
    auto token_itr = _token.find(from.value);
    check(token_itr == _token.end(), "1 at a time"); // User can only have one entry at a time

    // Create a new record to show funds are being held by user
    _token.emplace(payer, [&](auto &acct)
                   {
      acct.user = from;
      acct.funds = quantity; });

    waiting_table _waiting(payer, payer.value);
    auto waiting_itr = _waiting.find(quantity.amount);
    if (waiting_itr == _waiting.end())
    {
      // Create a new record to show user is looking for opponent
      _waiting.emplace(payer, [&](auto &acct)
                       {
        acct.user = from;
        acct.funds = quantity; });
    }
    else
    {
      // join the existing game
      create(waiting_itr->user, from, quantity * 2);
      _waiting.erase(waiting_itr);
    }
  }
}

/*
  The dequeue action can be called before a match with the host has been made.
  All TTT token currently staked is returned to host.
  Records in the ttt_token and waiting table are cleared.
*/
void ttt_contract::dequeue(const name &host)
{
  check(has_auth(host), "you are not authorized to do this");
  const name payer = get_self();
  // Init the _token table
  token_table _token(payer, payer.value);

  // Look for an existing user record from _token table
  auto token_itr = _token.find(host.value);
  check(token_itr != _token.end(), "No record found");

  waiting_table _waiting(payer, payer.value);
  auto waiting_itr = _waiting.find(token_itr->funds.amount);
  check(waiting_itr != _waiting.end(), "Not waiting");
  check(waiting_itr->user == host, "Not waiting");
  _waiting.erase(waiting_itr);

  return_tokens(host);
}

// Sets a 1 or a 2, depending on the current player, on the game board vector if a valid move is made
void ttt_contract::move(const name &host, const name &challenger, const uint8_t position)
{
  name user;
  uint8_t usern;
  name next;
  if (has_auth(host))
  {
    user = host;
    usern = 1;
    next = challenger;
  }
  else if (has_auth(challenger))
  {
    user = challenger;
    usern = 2;
    next = host;
  }
  check(user == host || user == challenger, "You are not authorized to do this");
  check(position < 9, "Invalid position");

  int64_t key = game_exists(host, challenger);
  check(key >= 0, "Game not found");

  games_table _games(get_self(), get_self().value);
  auto game_index = _games.find(key);
  int winner = 0;
  _games.modify(game_index, get_self(), [&](game &game)
                {
                  check(game.turn == user, "It is not your turn");
                  check(game.board[position] == 0, "Move not valid.");
                  check(game.winner != host && game.winner != challenger, "This game is already over");
                  game.board[position] = usern;
                  game.turn = next;
                  winner = check_winner(game.board);
                  switch (winner)
                  {
                  case 1:
                    game.winner = game.host;
                    break;
                  case 2:
                    game.winner = game.challenger;
                    break;
                  // case 3:
                  //   game.winner = name(CAT);
                  //   break;
                  } });
  if (winner != 0)
  {
    game_finished(key, winner);
  }
}

// ******************************************************************************************************************************* //
// ******************************************************************************************************************************* //
// ***************************************************** Private Actions ********************************************************* //
// ******************************************************************************************************************************* //
// ******************************************************************************************************************************* //

// Delete all records in all tables
void ttt_contract::clear()
{
  require_auth(get_self());

  games_table _games(get_self(), get_self().value);
  auto itr = _games.begin();
  while (itr != _games.end())
  {
    itr = _games.erase(itr);
  }

  rankings_table _rankings(get_self(), get_self().value);
  auto itr0 = _rankings.begin();
  while (itr0 != _rankings.end())
  {
    itr0 = _rankings.erase(itr0);
  }

  token_table _token(get_self(), get_self().value);
  auto itr1 = _token.begin();
  while (itr1 != _token.end())
  {
    itr1 = _token.erase(itr1);
  }

  waiting_table _waiting(get_self(), get_self().value);
  auto itr2 = _waiting.begin();
  while (itr2 != _waiting.end())
  {
    itr2 = _waiting.erase(itr2);
  }
}

// ******************************************************************************************************************************* //
// ******************************************************************************************************************************* //
// ***************************************************** Private Functions ******************************************************* //
// ******************************************************************************************************************************* //
// ******************************************************************************************************************************* //

void ttt_contract::create(const name &host, const name &challenger, const asset &bet)
{
  games_table _games(get_self(), get_self().value);

  _games.emplace(get_self(), [&](auto &game)
                 {
    game.key = _games.available_primary_key();
    game.time = current_time_point();
    game.host = host;
    game.challenger = challenger;
    game.turn = host;
    game.funds = bet;
    game.board = vector<uint8_t> (9,0); });
}

int ttt_contract::game_exists(const name &host, const name &challenger)
{
  games_table _games(get_self(), get_self().value);

  auto idx = _games.get_index<name("host")>();
  auto itr = idx.find(host.value);
  while (itr != idx.end())
  {
    if (itr->challenger == challenger)
    {
      return itr->key;
    }
    itr++;
  }
  return -1;
}

// returns: 0 = no winner, 1 = host won, 2 = challenger won, 3 = cat won
uint8_t ttt_contract::check_winner(const vector<uint8_t> &board)
{
  const uint8_t winningConditions[8][3] = {
      {0, 1, 2},
      {3, 4, 5},
      {6, 7, 8},
      {0, 3, 6},
      {1, 4, 7},
      {2, 5, 8},
      {0, 4, 8},
      {2, 4, 6}};

  bool cat_wins = true;
  for (uint8_t i = 0; i < 8; i++)
  {
    if (board[winningConditions[i][0]] == 1 && board[winningConditions[i][1]] == 1 && board[winningConditions[i][2]] == 1)
    {
      return 1;
    }
    else if (board[winningConditions[i][0]] == 2 && board[winningConditions[i][1]] == 2 && board[winningConditions[i][2]] == 2)
    {
      return 2;
    }
    else if (cat_wins && board[i] == 0)
    {
      cat_wins = false;
    }
  }

  if (cat_wins)
  {
    return 3;
  }
  else
  {
    return 0;
  }
}

// after a game has completed the rank table is updated
void ttt_contract::adjust_rank(const name &winner, const name &loser)
{
  rankings_table _rankings(get_self(), get_self().value);

  auto itr = _rankings.find(winner.value);
  if (itr == _rankings.end())
  {
    _rankings.emplace(get_self(), [&](auto &rank)
                      {
      rank.user = winner;
      rank.win  = 1; });
  }
  else
  {
    _rankings.modify(itr, get_self(), [&](auto &rank)
                     { rank.win++; });
  }

  itr = _rankings.find(loser.value);
  if (itr == _rankings.end())
  {
    _rankings.emplace(get_self(), [&](auto &rank)
                      {
      rank.user = loser;
      rank.loss  = 1; });
  }
  else
  {
    _rankings.modify(itr, get_self(), [&](auto &rank)
                     { rank.loss++; });
  }
}

void ttt_contract::return_tokens(name who)
{
  const name payer = get_self();
  // Init the _token table
  token_table _token(payer, payer.value);

  // Find the record from _token table
  auto itr = _token.find(who.value);
  check(itr != _token.end(), "you have not made a deposit");

  action(
      permission_level{get_self(), "active"_n},
      name(TOKEN_CONTRACT),
      "transfer"_n,
      make_tuple(get_self(), who, itr->funds, string("all TTT returned")))
      .send();

  _token.erase(itr);
}

void ttt_contract::award_pot(const name &winner, const name &loser)
{
  const name payer = get_self();
  // Init the _token table
  token_table _token(payer, payer.value);

  // award pot
  auto itr0 = _token.find(winner.value);
  check(itr0 != _token.end(), "deposit not found");
  auto itr1 = _token.find(loser.value);
  check(itr1 != _token.end(), "deposit not found");
  action(
      permission_level{get_self(), "active"_n},
      name(TOKEN_CONTRACT),
      "transfer"_n,
      make_tuple(get_self(), winner, itr0->funds + itr1->funds, string("pot award")))
      .send();
  _token.erase(itr1);
  _token.erase(itr0);
}

// once a game has finished game_finished handles all of the end game maintanace according to who is the winner
// winner == 1 (host) || 2 (challenger) || 3 (cat)
void ttt_contract::game_finished(int64_t key, uint8_t winner)
{
  games_table _games(get_self(), get_self().value);
  auto game_index = _games.find(key);

  switch (winner)
  {
  case 1: // host won
    award_pot(game_index->host, game_index->challenger);

    adjust_rank(game_index->host, game_index->challenger);
    break;
  case 2: // challenger won
    award_pot(game_index->challenger, game_index->host);
    adjust_rank(game_index->challenger, game_index->host);
    break;
  case 3: // cat won
    return_tokens(game_index->host);
    return_tokens(game_index->challenger);
    break;
  }
  _games.erase(game_index);
}