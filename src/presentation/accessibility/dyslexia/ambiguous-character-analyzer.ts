const CHARACTER_NAMES: Readonly<Record<string, string>> = {
  '0': 'number zero',
  O: 'uppercase O',
  o: 'lowercase o',
  '1': 'number one',
  l: 'lowercase L',
  I: 'uppercase I',
  b: 'lowercase b',
  d: 'lowercase d',
  p: 'lowercase p',
  q: 'lowercase q',
  '{': 'opening curly bracket',
  '}': 'closing curly bracket',
  '(': 'opening parenthesis',
  ')': 'closing parenthesis',
  '[': 'opening square bracket',
  ']': 'closing square bracket',
  ';': 'semicolon',
  ':': 'colon',
  _: 'underscore',
  '-': 'hyphen',
};

export function describeAmbiguousCharacters(text: string, startingLine: number): readonly string[] {
  const descriptions: string[] = [];
  for (const [lineOffset, line] of text.split(/\r?\n/u).entries()) {
    const counts = new Map<string, number>();
    for (const character of line) {
      const name = CHARACTER_NAMES[character];
      if (name !== undefined) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    if (counts.size === 0) continue;
    descriptions.push(
      `Line ${String(startingLine + lineOffset)} contains ${[...counts.entries()]
        .map(([name, count]) => `${String(count)} ${name}`)
        .join(', ')}.`,
    );
  }
  return descriptions;
}
