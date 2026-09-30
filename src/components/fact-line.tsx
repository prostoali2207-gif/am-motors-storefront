/** Inline key facts ("48,000 km · GCC · Automatic"); renders nothing when no fact exists. */
export function FactLine({ facts, className }: { facts: readonly string[]; className?: string }) {
  if (facts.length === 0) return null;
  return (
    <ul className={className ? `fact-line ${className}` : "fact-line"}>
      {facts.map((fact, index) => (
        <li key={index}>{fact}</li>
      ))}
    </ul>
  );
}
