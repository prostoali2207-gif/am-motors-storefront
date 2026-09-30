/**
 * Inline key facts ("48,000 km · GCC · Automatic"); renders nothing when no fact exists.
 * Each fact is a bidi isolate so Latin/Cyrillic values and figures keep their own order inside
 * Arabic (RTL) text, while the list itself follows the page direction.
 */
export function FactLine({ facts, className }: { facts: readonly string[]; className?: string }) {
  if (facts.length === 0) return null;
  return (
    <ul className={className ? `fact-line ${className}` : "fact-line"}>
      {facts.map((fact, index) => (
        <li key={index}>
          <bdi>{fact}</bdi>
        </li>
      ))}
    </ul>
  );
}
