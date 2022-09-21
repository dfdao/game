import { Leaderboard } from '@dfdao/types';

export async function loadLeaderboard(): Promise<Leaderboard> {
  if (!import.meta.env.DF_WEBSERVER_URL) {
    return { entries: [] };
  }

  const address = `${import.meta.env.DF_WEBSERVER_URL}/leaderboard`;
  const res = await fetch(address, {
    method: 'GET',
  });

  const rep = await res.json();

  if (rep.error) {
    throw new Error(rep.error);
  }

  return rep;
}
