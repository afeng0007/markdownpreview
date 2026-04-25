import { describe, it, expect, beforeEach } from "vitest";
import { MarkdownRenderer } from "../core/MarkdownRenderer";

describe("MarkdownRenderer", () => {
  let renderer: MarkdownRenderer;

  beforeEach(() => {
    renderer = new MarkdownRenderer();
  });

  it("should render basic markdown to HTML", () => {
    const html = renderer.render("# Hello", "test.md", 8080);
    expect(html).toContain("<h1>Hello</h1>");
  });

  it("should include GitHub-style CSS", () => {
    const html = renderer.render("# Test", "test.md", 8080);
    expect(html).toContain("markdown-body");
  });

  it("should include mermaid.js script", () => {
    const html = renderer.render("```mermaid\ngraph LR\nA-->B\n```", "test.md", 8080);
    expect(html).toContain("mermaid");
  });

  it("should render code blocks with syntax highlighting", () => {
    const html = renderer.render("```javascript\nconst x = 1;\n```", "test.md", 8080);
    expect(html).toContain("hljs");
  });

  it("should preserve mermaid blocks as raw content", () => {
    const md = "```mermaid\ngraph LR\n    A-->B\n```";
    const html = renderer.render(md, "test.md", 8080);
    expect(html).toContain("class=\"mermaid\"");
    expect(html).toContain("graph LR");
  });

  it("should include WebSocket client script", () => {
    const html = renderer.render("# Test", "test.md", 8080);
    expect(html).toContain("WebSocket");
    expect(html).toContain("8080");
  });

  it("should include toolbar with refresh button", () => {
    const html = renderer.render("# Test", "test.md", 8080);
    expect(html).toContain("toolbar");
    expect(html).toContain("test.md");
  });

  it("should include highlight CSS link", () => {
    const html = renderer.render("# Test", "test.md", 8080);
    expect(html).toContain("/assets/highlight.css");
  });
});
