import { describe, it, expect, beforeEach } from "vitest";
import { FileRegistry } from "../core/FileRegistry";

describe("FileRegistry", () => {
  let registry: FileRegistry;

  beforeEach(() => {
    registry = new FileRegistry();
  });

  it("should register a file and return a fileId", () => {
    const filePath = "/path/to/test.md";
    const fileId = registry.register(filePath);
    expect(fileId).toBeTruthy();
    expect(typeof fileId).toBe("string");
  });

  it("should return the same fileId for the same file", () => {
    const filePath = "/path/to/test.md";
    const id1 = registry.register(filePath);
    const id2 = registry.register(filePath);
    expect(id1).toBe(id2);
  });

  it("should return different fileIds for different files", () => {
    const id1 = registry.register("/path/to/a.md");
    const id2 = registry.register("/path/to/b.md");
    expect(id1).not.toBe(id2);
  });

  it("should get all registered files", () => {
    registry.register("/path/to/a.md");
    registry.register("/path/to/b.md");
    const files = registry.getAll();
    expect(files).toHaveLength(2);
    expect(files[0].fileName).toBe("a.md");
    expect(files[1].fileName).toBe("b.md");
  });

  it("should check if file is registered", () => {
    registry.register("/path/to/test.md");
    expect(registry.hasFile("/path/to/test.md")).toBe(true);
    expect(registry.hasFile("/path/to/other.md")).toBe(false);
  });

  it("should unregister a file by fileId", () => {
    const fileId = registry.register("/path/to/test.md");
    registry.unregister(fileId);
    expect(registry.hasFile("/path/to/test.md")).toBe(false);
    expect(registry.getAll()).toHaveLength(0);
  });

  it("should find fileId by file path", () => {
    const filePath = "/path/to/test.md";
    registry.register(filePath);
    const fileId = registry.getFileId(filePath);
    expect(fileId).toBeTruthy();
  });

  it("should return undefined for unregistered file path", () => {
    const fileId = registry.getFileId("/not/registered.md");
    expect(fileId).toBeUndefined();
  });
});
