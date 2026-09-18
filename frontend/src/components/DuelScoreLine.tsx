/** The duel's place and score on the felt, e.g. "Turn 3 of 5 · You 2 · Robo 1". */
export default function DuelScoreLine({
  unit,
  at,
  of,
  myPoints,
  roboPoints,
}: {
  unit: 'Turn' | 'Hand'
  at: number
  of: number
  myPoints: number
  roboPoints: number
}) {
  return <p className="font-display text-xl font-semibold text-chalk">{`${unit} ${at} of ${of} · You ${myPoints} · Robo ${roboPoints}`}</p>
}
