import { Action } from "@proton/hyperion";

export interface GameData {
  host: string;
  challenger: string;
  time: string;
  turn: string;
  funds: string;
  board: string;
  key: string;
}

export interface ActionMove
  extends Action<{
    payload: {
      challenger: string;
      host: string;
      position: number;
    };
  }> {
  timestamp: string;
}

interface GameWinner {
  winner: string;
  game: string[];
}

interface GameOverEvent extends CustomEvent<GameWinner> {}
