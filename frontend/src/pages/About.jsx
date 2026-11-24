import { Link } from "react-router-dom";
const CONTENT = [
  ["Discover beyond the usual", "Food Atlas helps you find restaurants, cafes and neighbourhood favourites in one place. Search by name, cuisine or location and explore what is nearby."],
  ["Find the details that matter", "Restaurant pages bring together the information available in each listing, including cuisine, address, opening hours, photos, ratings and directions."],
  ["Built around your appetite", "Use filters to narrow the list, browse categories and keep exploring until you find the right place for your next meal."]
];
export default function About() {
  return <div className="wrap page-shell about-page">
    <div className="page-intro"><div className="eyebrow">A MAP FOR THE HUNGRY</div><h1>Every meal has<br /><i>a story.</i></h1><p>Food Atlas is your guide to discovering places and flavours worth remembering.</p></div>
    <div className="about-content">{CONTENT.map(([title, body], i) => <article key={title}><span>0{i + 1}</span><div><h2>{title}</h2><p>{body}</p></div></article>)}</div>
    <div className="closing-cta"><div><div className="eyebrow">LET'S FIND YOUR NEXT FAVOURITE</div><h2>Follow your appetite.</h2></div><Link className="btn btn-light" to="/explore">Explore Food Atlas ↗</Link></div>
  </div>;
}
