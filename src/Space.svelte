<script>
  export let space = "";
  export let winner = "";
  $: won = (winner !== "") & (space === winner);
  $: gameOver = winner !== null && winner !== undefined && winner !== "";
  $: console.log(winner);
  $: console.log(gameOver);
</script>

<style>
  .player {
    border: solid 1px gray;
    height: 125px;
    width: 125px;
    flex: 1;
    align-content: center;
    justify-content: space-around;
    font-size: 75px;
    text-align: center;
    line-height: 125px;
    cursor: pointer;
  }
  .winner {
    color: rebeccapurple;
  }
  .disabled {
    cursor: not-allowed !important;
  }
</style>

<div class:disabled={gameOver} class:winner={won} on:click class="player">
  {space}
</div>
