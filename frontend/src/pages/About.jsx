const BLOCKS = [
  ["Our mission", "Make it easy to find places worth eating at, whether it’s a famous kitchen or a street stall only locals know."],
  ["Restaurant discovery", "Browse by cuisine, search by dish or neighbourhood, and sort by rating to find the right table quickly."],
  ["Exploring food experiences", "Every restaurant page shows photos, details and reviews, so you know what to expect before you go."],
];
export default function About() {
  return (
    <div className="wrap prose" style={{ paddingTop: 40 }}>
      <h1 style={{ fontSize: "clamp(36px,5vw,56px)" }}>About Food Atlas</h1>
      {BLOCKS.map(([h, t]) => (<div key={h}><h2 style={{ marginTop: 36, fontSize: 28 }}>{h}</h2><p>{t}</p></div>))}
    </div>
  );
}
