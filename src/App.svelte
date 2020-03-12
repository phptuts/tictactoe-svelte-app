<script>
  import Space from "./Space.svelte";
  import gameStore from "./game-store.js";
  import { nextMove, resetGame } from "./request.js";
  let board = ["", "", "", "", "", "", "", "", ""];
  let nextPlayer;
  let winner;
  let numberOfPeeps = 0;
  gameStore.subscribe(state => {
    if (!state) {
      return;
    }
    console.log(state);
    winner = state.winner;
    nextPlayer = state.nextPlayer;
    board = state.board;
    numberOfPeeps = state.numberOfPeeps;
  });
  let errorMessage = "";

  async function takeSpace(space) {
    if (winner) {
      return;
    }

    if (!gameStore.isConnected) {
      gameStore.connect();
    }

    errorMessage = await nextMove(space);
  }

  async function reset() {
    await resetGame();
  }
</script>

<style>
  main {
    width: 475px;
    margin: 0 auto;
    height: 1000px;
  }
  .row {
    display: flex;
  }

  .errorMessage {
    color: red;
    font-size: 20px;
  }
  button {
    width: 100%;
    margin-top: 20px;
    border-radius: 0;
    background-color: lightblue;
    font-size: 30px;
    cursor: pointer;
    outline: none;
  }
  
</style>

<main>
  <h1>Tic Tac Toe</h1>
  <h2>Number of poeple playing: {numberOfPeeps}</h2>
  {#if winner == 'TIE'}
    <h2>Tie Game!!!</h2>
  {:else if winner}
    <h2>Player {winner} won!!!</h2>
  {:else}
    <h2>Player {nextPlayer}</h2>
  {/if}
  <div class="row">
    <Space {winner} on:click={() => takeSpace(0)} space={board[0]} />
    <Space {winner} on:click={() => takeSpace(1)} space={board[1]} />
    <Space {winner} on:click={() => takeSpace(2)} space={board[2]} />
  </div>

  <div class="row">
    <Space {winner} on:click={() => takeSpace(3)} space={board[3]} />
    <Space {winner} on:click={() => takeSpace(4)} space={board[4]} />
    <Space {winner} on:click={() => takeSpace(5)} space={board[5]} />
  </div>

  <div class="row">
    <Space {winner} on:click={() => takeSpace(6)} space={board[6]} />
    <Space {winner} on:click={() => takeSpace(7)} space={board[7]} />
    <Space {winner} on:click={() => takeSpace(8)} space={board[8]} />
  </div>
  {#if winner}
    <button on:click={reset}>New Game</button>
  {/if}
  {#if errorMessage}
    <p class="errorMessage">{errorMessage}</p>
  {/if}

</main>
