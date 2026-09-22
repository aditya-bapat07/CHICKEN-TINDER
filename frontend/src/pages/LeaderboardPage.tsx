import { getLeaderboard } from "../api";
import { useAuth } from "../context/AuthContext";
import { Empty, Loading, LoadError, useLoad } from "../components/UI";
export default function LeaderboardPage() {
  const list = useLoad(getLeaderboard);
  const { user } = useAuth();
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>The delightfully indecisive.</h1>
          <p>Celebrating the people who let fate pick their next adventure.</p>
        </div>
        <span className="large-emoji">♜</span>
      </div>
      <section className="leaderboard-intro">
        <span>✳</span>
        <div>
          <h2>A little nudge. A lot of possibility.</h2>
          <p>
            Every tenth consecutive pass becomes a match. These are our top ten
            fate followers, ranked by total forced matches.
          </p>
        </div>
      </section>
      {list.loading ? (
        <Loading />
      ) : list.error ? (
        <LoadError error={list.error} retry={list.reload} />
      ) : list.data?.length ? (
        <div className="panel leaderboard-table">
          <div className="leaderboard-row table-heading">
            <span>RANK</span>
            <span>ADVENTURER</span>
            <span>FATE PICKS</span>
          </div>
          {list.data.map((item, i) => (
            <div
              className={`leaderboard-row ${user?.id === item.userId ? "you" : ""}`}
              key={item.userId}
            >
              <span className="rank">{String(i + 1).padStart(2, "0")}</span>
              <span className="leaderboard-user">
                <span className="avatar">{item.userName[0].toUpperCase()}</span>
                <strong>{item.userName}</strong>
                {user?.id === item.userId && (
                  <span className="badge pending">You</span>
                )}
              </span>
              <strong>{item.forcedMatchesCount}</strong>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="The flock is just getting started.">
          <p>The first fate-picked adventures will appear here.</p>
        </Empty>
      )}
    </>
  );
}
