const colors: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Java: '#b07219',
  Go: '#00ADD8',
  Rust: '#dea584',
  Ruby: '#701516',
  CSS: '#663399',
  HTML: '#e34c26',
  Shell: '#89e051',
  C: '#555555',
  'C++': '#f34b7d',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
};

export function languageColor(language: string): string {
  return colors[language] ?? '#7a8494';
}
