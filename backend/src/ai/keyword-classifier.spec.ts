import { classifyByKeywords } from './keyword-classifier.js';

describe('keyword classifier (AI fallback)', () => {
  it.each([
    ['My kitchen sink is leaking under the cabinet', 'plumbing'],
    ['The washing machine makes a loud noise when it spins', 'appliance-repair'],
    ['AC is running but not cold anymore', 'ac-repair'],
    ['Breaker keeps tripping when I switch on the kettle', 'electrical'],
    ['Termites in the wooden door frame', 'pest-control'],
  ])('"%s" → %s', (text, slug) => {
    expect(classifyByKeywords(text).slug).toBe(slug);
  });

  it('flags emergencies', () => {
    expect(classifyByKeywords('I can smell gas in the kitchen').urgency).toBe('emergency');
    expect(classifyByKeywords('Sparks coming from the socket').urgency).toBe('emergency');
  });

  it('returns no category when nothing matches', () => {
    expect(classifyByKeywords('hello there').slug).toBeNull();
  });

  it('does not match short words inside longer words', () => {
    // "ac" must not match "back", "ant" must not match "want"
    expect(classifyByKeywords('I want to come back later').slug).toBeNull();
  });
});
