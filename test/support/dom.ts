// A tiny stand-in for the DOM, enough for src/render.ts in Node: elements with children, text nodes,
// attributes and dataset. No parser and no innerHTML, so a test sees exactly the nodes render.ts made.

export class FakeText {
  constructor(public data: string) {}
  get textContent(): string {
    return this.data;
  }
}

type Child = FakeElement | FakeText;

export class FakeElement {
  [prop: string]: unknown;
  readonly tagName: string;
  children: Child[] = [];
  readonly dataset: Record<string, string> = {};
  readonly attributes: Record<string, string> = {};
  parent?: FakeElement;
  className = '';

  constructor(tag: string) {
    this.tagName = tag.toUpperCase();
  }

  get textContent(): string {
    return this.children.map((c) => c.textContent).join('');
  }

  set textContent(text: string) {
    this.children = [new FakeText(text)];
  }

  get elements(): FakeElement[] {
    return this.children.filter((c): c is FakeElement => c instanceof FakeElement);
  }

  append(...nodes: (Child | string)[]): void {
    for (const n of nodes) {
      const child = typeof n === 'string' ? new FakeText(n) : n;
      if (child instanceof FakeElement) child.parent = this;
      this.children.push(child);
    }
  }

  replaceChildren(...nodes: Child[]): void {
    this.children = [];
    this.append(...nodes);
  }

  after(...nodes: Child[]): void {
    const siblings = this.parent?.children;
    if (!siblings) return;
    siblings.splice(siblings.indexOf(this) + 1, 0, ...nodes);
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  focus(): void {}

  /** Every element below this one, depth first. */
  all(): FakeElement[] {
    return this.elements.flatMap((e) => [e, ...e.all()]);
  }

  /** The descendants whose class list holds [name]. */
  byClass(name: string): FakeElement[] {
    return this.all().filter((e) => e.className.split(' ').includes(name));
  }

  querySelector(selector: string): FakeElement | null {
    return selector.startsWith('.') ? (this.byClass(selector.slice(1))[0] ?? null) : null;
  }
}

/** Installs a fresh fake `document` on globalThis and returns a `main` to render into. */
export function fakeDocument(): FakeElement {
  const body = new FakeElement('body');
  (globalThis as { document?: unknown }).document = {
    body,
    title: '',
    createElement: (tag: string) => new FakeElement(tag),
  };
  const main = new FakeElement('main');
  body.append(main);
  return main;
}
