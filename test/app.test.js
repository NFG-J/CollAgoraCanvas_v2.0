const { clampVote, formatMarkdownItem, builtInTemplates, composeAiPrompt } = require('../app.js');

describe('CollAgora Canvas utility functions', () => {
  test('clampVote keeps scores between 1 and 5', () => {
    expect(clampVote(0)).toBe(1);
    expect(clampVote(3)).toBe(3);
    expect(clampVote(9)).toBe(5);
    expect(clampVote('abc')).toBe(3);
  });

  test('formatMarkdownItem exports sticky notes with score', () => {
    const line = formatMarkdownItem({ type: 'sticky-note', votes: 5, text: 'Prioritised idea' });
    expect(line).toContain('[5/5]');
    expect(line).toContain('Prioritised idea');
  });

  test('built-in templates include Lean Canvas and Business Model Canvas', () => {
    const ids = builtInTemplates.map((template) => template.templateId);
    expect(ids).toContain('lean-canvas');
    expect(ids).toContain('business-model-canvas');
  });

  test('composeAiPrompt embeds instructions and fenced Markdown data', () => {
    const prompt = composeAiPrompt('theme-gap', 'markdown', '# Example\n\n- idea one');
    expect(prompt).toContain('Group the ideas by theme');
    expect(prompt).toContain('```markdown');
    expect(prompt).toContain('- idea one');
  });

  test('composeAiPrompt embeds JSON data with a json fence and falls back for unknown templates', () => {
    const prompt = composeAiPrompt('not-a-real-template', 'json', '{"a":1}');
    expect(prompt).toContain('Group the ideas by theme');
    expect(prompt).toContain('```json');
    expect(prompt).toContain('{"a":1}');
  });
});
