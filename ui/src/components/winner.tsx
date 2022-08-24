import "./winner.css";
import { useEffect, useRef, useState } from "react";
import { GameOverEvent, GameWinner } from "./types";
import TTT from "./ttt";
import useEventListener from "./use-event-listener";

const WinnerModal = () => {
  const [gameWinner, setGame] = useState<GameWinner>({
    winner: "",
    game: [],
  });

  useEventListener("GameOverEvent", (e: GameOverEvent) => {
    console.log(e.detail);
    setGame(e.detail);
  });

  if (gameWinner.winner) {
    return (
      <div className="modal">
        <div className="content">
          <h3>{gameWinner.winner} wins!</h3>
          <TTT squares={gameWinner.game} onClick={() => {}} />
          <button
            className="pure-button"
            onClick={() => {
              setGame({ winner: "", game: [] });
            }}
          >
            OK!
          </button>
        </div>
      </div>
    );
  } else {
    return null;
  }
};

export default WinnerModal;
