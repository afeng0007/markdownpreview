# 代码高亮测试

## JavaScript

```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
  return { message: `Hello, ${name}!` };
}
```

## Python

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```

## TypeScript

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

function createUser(data: Partial<User>): User {
  return { id: Date.now(), name: "", email: "", ...data };
}
```
