import { Link, useParams } from "react-router-dom";
import { getShared } from "../api";
import { Art, Loading, LoadError, useLoad } from "../components/UI";
export default function SharedPage() {
  const { token } = useParams();
  const match = useLoad(() => getShared(token!), [token]);
  if (match.loading) return <Loading />;
  if (match.error)
    return <LoadError error={match.error} retry={match.reload} />;
  const m = match.data!;
  return (
    <div className="shared-wrap">
      <span className="eyebrow coral">GOOD PLANS TRAVEL</span>
      <h1>{m.sharedBy} has an idea.</h1>
      <p>And it has all the makings of a good day.</p>
      <article className="panel shared-card">
        <Art category={m.activity.category} large />
        <div className="match-body">
          <span className="eyebrow">
            {m.activity.category} ·{" "}
            {m.status === "pending" ? "Up next" : m.status}
          </span>
          <h2>{m.activity.title}</h2>
          <p>{m.activity.description}</p>
          <div className="detail-chips">
            <span>{m.activity.durationMin} minutes</span>
            <span>
              {m.activity.budget === 1
                ? "Free"
                : `Budget ${m.activity.budget}/5`}
            </span>
          </div>
          <Link className="btn full" to="/swipe">
            Find my own adventure →
          </Link>
        </div>
      </article>
    </div>
  );
}
