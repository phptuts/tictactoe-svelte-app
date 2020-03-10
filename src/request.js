export const nextMove = async (space) => {
  try {
    const response = await fetch(`${process.env.url}/next-turn/${space}`);
    const message = await response.json();
    return message.errorMessage;
  } catch (err) {
    console.log(err);
    return 'Error connecting to the server.';
  }
};

export const resetGame = async () => {
  try {
    await fetch(`${process.env.url}/reset`);
  } catch (e) {
    console.log(e);
  }
};
