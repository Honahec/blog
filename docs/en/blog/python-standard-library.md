---
title: Python Common Built-in Libraries
createTime: 2025/11/11 15:06:34
permalink: /en/blog/36w33v9t/
tags:
  - Backend
---

> [!NOTE]
>
> This article documents commonly used Python built-in libraries. The original intention of writing this blog was to review for ==ShanghaiTech SI100B MidTerm==.

## collections

> [!INFO]
>
> Python has many built-in data types and methods. Collections provides additional high-performance data types and methods on top of these. Mastering this library can greatly simplify Python code and implementation difficulty.

### Module Subclasses

Use `collections.__all__` to view all subclasses.

::: python-repl title="View All Subclasses"

```python
import collections
print(collections.__all__) # ['ChainMap', 'Counter', 'OrderedDict', 'UserDict', 'UserList', 'UserString', 'defaultdict', 'deque', 'namedtuple']
```

:::

There are nine subclasses in total, with the following functions:

| Subclass    | Function                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| nametuple() | Factory function for creating named tuple subclasses, generates tuple subclasses accessible by name   |
| deque       | Double-ended queue                                                                                    |
| ChainMap    | Dictionary-like container class that maps multiple collections into a single view                     |
| Counter     | Subclass of dict, provides counting functionality for hashable objects                                |
| OrderedDict | Subclass of dict, preserves the order in which items were added, ordered dictionary                   |
| defaultdict | Subclass of dict, provides a factory function to supply default values for dictionary queries         |
| UserDict    | Wraps dictionary objects, simplifies dictionary subclassing                                           |
| UserList    | Wraps list objects, simplifies list subclassing                                                       |
| UserString  | Wraps string objects, simplifies string subclassing                                                   |

==This article will introduce three useful and commonly used subclasses: Counter, deque, and defaultdict.==

### Counter

A counter tool provides fast and convenient counting. Counter is a subclass of dict, used for ==counting hashable objects==. It is a collection where elements are stored as dictionary keys and counts as values.

::: python-repl title="Count Word Occurrences"

```python
from collections import Counter
data = ['blue', 'red', 'blue', 'green', 'red', 'red']
print(Counter(data)) # Counter({'red': 3, 'blue': 2, 'green': 1})
```

:::

Of course, you can convert it to an iterable object using `.items()`:

::: python-repl title="Convert to Iterable Object"

```python
from collections import Counter
data = ['blue', 'red', 'blue', 'green', 'red', 'red']
c = Counter(data)
print(c)

for key, value in c.items():
    print(key, value)

sorted_items = sorted(c.items(), key = lambda x: x[1])
print(sorted_items)

```

:::

There are many hashable objects:

::: python-repl title="Other Hashable Objects"

```python
from collections import Counter

# String
print(Counter('applications')) # Counter({'a': 2, 'p': 2, 'i': 2, 'l': 1, 'c': 1, 't': 1, 'o': 1, 'n': 1, 's': 1})

# Dictionary
print(Counter({'red': 4, 'blue': 2})) # Counter({'red': 4, 'blue': 2})

# Unspecified objects
print(Counter(dogs=114, cats=514)) # Counter({'cats': 514, 'dogs': 114})
```

:::

#### `elements()`

Returns an iterator where each element will be repeated as many times as its count. Elements are returned in the order they were first encountered. If a count is less than $1$, `elements()` will ignore it.

::: python-repl title="Demo"

```python
from collections import Counter
data = ['blue', 'red', 'blue', 'green', 'red', 'red']
c = Counter(data)

print(list(c.elements())) # [!code highlight] ['blue', 'blue', 'red', 'red', 'red', 'green']
```

:::

#### `most_common(n: int)`

Returns a list of the $n$ most common elements and their counts, sorted from most to least common. Elements with equal counts are ordered in the order they were first encountered.

::: python-repl title="Demo"

```python
from collections import Counter
data = ['blue', 'red', 'blue', 'green', 'red', 'red']
c = Counter(data)

print(c.most_common(2)) # [!code highlight]
```

:::

#### `subtract(c: collections.Counter)`

Subtracts elements from an iterable object:

::: python-repl title="Demo"

```python
from collections import Counter
c = Counter(a=4, b=2, c=0, d=-2)
d = Counter(a=1, b=2, c=3, d=4)
c.subtract(d)
print(c)
```

:::

#### Dictionary Methods

Most dictionary methods can be used with Counter objects, except two methods that work differently from dictionaries.

`fromkeys(iterable)`

This class method is not implemented in Counter.

`update([iterable-or-mapping])`

Counts elements from an iterable or adds from another mapping object (or counter). Like `dict.update()`, but adds instead of replacing. Additionally, the iterable should be a sequence of elements, not `(key, value)` pairs.

::: python-repl title="Demo"

```python
from collections import Counter
data = ['blue', 'red', 'blue', 'green', 'red', 'red']
c = Counter(data)

print(c.values())
print(sum(c.values()))
print(list(c))
print(set(c))
print(dict(c))
print(c.items())
```

:::

### deque - Double-ended Queue

A double-ended queue can quickly add and pop objects from either end.

#### `append(x)`

Adds `x` to the right end.

::: python-repl title="Demo"

```python
from collections import deque
d = deque('abc')

d.append([1, 2, 3])
print(d)
```

#### `appendleft()`

Adds `x` to the left end.

::: python-repl title="Demo"

```python
from collections import deque
d = deque('abc')

d.appendleft([1, 2, 3])
print(d)
```

:::

#### `clear()`

Removes all elements.

::: python-repl title="Demo"

```python
from collections import deque
d = deque('abc')

d.clear()
print(d)
```

:::

#### `copy()`

Creates a shallow copy.

::: python-repl title="Demo"

```python
from collections import deque
d = deque('abc')

c = d.copy()
print(c)
```

:::

#### `count(x)`

Counts the number of elements in the deque equal to x.

::: python-repl title="Demo"

```python
from collections import deque
d = deque('abca')

print(d.count('a'), d.count('b'))
```

:::

#### `extend(x)`

Extends the right side of the deque by adding elements from the iterable argument.

::: python-repl title="Demo"

```python
from collections import deque
d = deque('abc')

d.extend([1, 2, 3])
print(d)
```

:::

#### `extendleft(x)`

Same principle, no further elaboration.

#### `index(x)`

Returns the position of x in the deque, returns the first match, raises ValueError if not found.

::: python-repl title="Demo"

```python
from collections import deque
d = deque('abc')

print(d.index('b'))
try:
    print(d.index('d'))
except Exception as e:
    print(f'{type(e)} {e}')
```

:::

#### `insert(i: int, x)`

Inserts x at position i.

If the insertion would cause a bounded deque to exceed maxlen, an IndexError is raised.

::: python-repl title="Demo"

```python
from collections import deque
d = deque('abc')

d.insert(1, [1, 2, 3])
print(d)

d1 = deque(maxlen=3)
d1.extend(['a', 'b', 'c'])
print(d1)
try:
    d1.insert(1, [1, 2, 3])
    print(d1)
except Exception as e:
    print(f'{type(e)} {e}')
```

:::

#### `pop()`

Removes and returns the rightmost element. Raises IndexError if no elements exist.

::: python-repl title="Demo"

```python
from collections import deque
d = deque('abc')

try:
    while True:
        print(d.pop())
except Exception as e:
    print(f'{type(e)} {e}')
```

:::

#### `remove(value)`

Removes the first occurrence of value. Raises ValueError if not found.

::: python-repl title="Demo"

```python
from collections import deque
d = deque('abc')

try:
    d.remove('a')
    print(d)
    d.remove('a')
    print(d)
except Exception as e:
    print(f'{type(e)} {e}')
```

:::

#### `reverse()`

Reverses the deque in place, returns None.

::: python-repl title="Demo"

```python
from collections import deque
d = deque('abc')

print(d)
print(d.reverse())
print(d)
```

:::

#### `rotate(n:int = 1)`

Rotates the deque n steps to the right. If n is negative, rotates to the left.

::: python-repl title="Demo"

```python
from collections import deque
d = deque('abc')

print(d)
d.rotate(2)
print(d)
d.rotate()
print(d)
```

:::

#### Additional Notes

In addition to the above operations, deque also supports iteration, pickling, `len(d)`, `reversed(d)`, `copy.deepcopy(d)`, `copy.copy(d)`, membership testing with the in operator, and subscript indexing (e.g., accessing the first element via `d[0]`). ==Index access has O(1) complexity at both ends, but degrades to O(n) in the middle. For fast random access, use lists.==

Starting from version 3.5, Deque also supports the `__add__()`, `__mul__()`, and `__imul__()` magic methods.

### defaultdict - Default Dictionary

Dictionaries are very useful, but you often encounter the following annoyance:

When you want to get a key from a dict, there are usually two methods: the first is get, the second is through [].

==When using dict, if the referenced Key doesn't exist, a KeyError will be raised. If you want to return a default value when the key doesn't exist, you can use defaultdict.==

#### Basic Introduction

`defaultdict([default_factory[, ...]])`

Returns a new dictionary-like object. defaultdict is a subclass of the built-in dict class. It overrides one method and adds a writable instance variable. All other functionality is the same as dict.

This object contains an attribute named default_factory. During construction, the first parameter is used to provide an initial value for this attribute, defaulting to None. All other arguments (including keyword arguments) are equivalent to those passed to the dict constructor.

In addition to supporting standard dict operations, defaultdict objects also support the following method as an extension:

`__missing__(key)`

If the default_factory attribute is None, calling this method will raise a KeyError exception with the key as an argument.

If default_factory is not None, it is called (without arguments) to provide a default value for the key. This value and the key are inserted into the dictionary as a key-value pair and returned as the method's return value.

If calling default_factory raises an exception, that exception is propagated unchanged to the outer layer.

This method is called by the `__getitem__()` method in dict when the required key cannot be found. Whether this method returns a value or raises an exception, it is passed through by `__getitem__()`.

Note that `__missing__()` is not called by any method other than `__getitem__()`. This means get() will return None like a normal dict, rather than using default_factory.

#### Examples

Using list as default_factory, easily convert a sequence of (key-value pairs) into a dictionary of (key-lists):

::: python-repl title="Demo"

```python
from collections import defaultdict
s  = [('green', 1), ('blue', 2), ('green', 3), ('blue', 4), ('red', 1)]
d = defaultdict(list)
for key, value in s:
    d[key].append(value)

print(d)
print(sorted(d.items()))
```

:::

When each key is first encountered, it's not yet in the dictionary, so the entry is automatically created by calling the default_factory method, which returns an empty list. The list.append() operation adds the value to this new list. When the key is accessed again, normal operation occurs, and list.append() adds another value to the list. This counting is faster and simpler than its equivalent method dict.setdefault():

::: python-repl title="Demo"

```python
s = [('green', 1), ('blue', 2), ('green', 3), ('blue', 4), ('red', 1)]
d = {}
for key, value in s:
    d.setdefault(key, []).append(value)

print(d)
print(sorted(d.items()))
```

:::

Setting default_factory to int makes defaultdict useful for counting:

::: python-repl title="Demo"

```python
from collections import defaultdict
s = 'applications'
d = defaultdict(int)
for key in s:
    d[key] += 1

print(d)
print(sorted(d.items()))
print(sorted(list(d.items()), key = lambda x : (x[1], x[0])))
```

:::

defaultdict will never raise a KeyError. If a key doesn't exist, defaultdict will insert and return a placeholder value instead:

::: python-repl title="Demo"

```python
from collections import defaultdict
d = defaultdict(list)
print(d["missing"])
```

:::

But if you run the same logic using a regular dictionary:

::: python-repl title="Demo"

```python
d = {}
print(d["missing"])
```

:::
## fractions

> [!INFO]
>
> The fractions library in Python provides support for precise rational number calculations, suitable for fraction operations.

::: python-repl title="Demo"

```python
import fractions

# 创建分数对象
a = fractions.Fraction(1, 2)
b = fractions.Fraction(1, 3)

print(a, b)
print(type(a), type(b))

print(a * b)
print(a + b)
print(type(a + b))
print(float(a + b))

print(a.numerator)
print(a.denominator)
print(type(a.numerator))

```

:::

## itertools

> [!INFO]
>
> As the name suggests, this is a powerful iterator toolkit library. This article only introduces its special usage.

::: python-repl title="Demo"

```python
import itertools

# 全排列
for x in itertools.permutations([1, 2, 3]):
    print(x)

print('next')

# 组合
for x in itertools.combinations([1, 2, 3], 2):
    print(x)

print('next')

# 前缀和
for x in itertools.accumulate([1, 2, 3, 4]):
    print(x)
```

:::
## heapq

> [!INFO]
>
> This Python library provides min-heap functionality (priority queue)

::: python-repl title="Demo"

```python
import heapq, random
heap = []

for i in range(10):
    heapq.heappush(heap, random.randint(1, 100))

print(heap)

for i in range(10):
    print(heapq.heappop(heap))
```

:::

## Referenced Web Resources

[Zhihu - [Detailed 10,000-Word Explanation] Python Library collections, Making You Outperform 99% of Pythoners](https://zhuanlan.zhihu.com/p/343747724)