---
title: Python 常用内置库
createTime: 2025/11/11 15:06:34
permalink: /blog/36w33v9t/
tags:
  - 后端
---

> [!NOTE]
>
> 本文记录了 python 常用内置库，写本篇 blog 本意为复习 ==ShanghaiTech SI100B MidTerm==。

## collections

> [!INFO]
>
> Python 内置了很多数据类型和方法，Collections 在其基础上提供了额外的高性能数据类型和方法，熟练此库可大大简化 Python 代码和实现难度。

### 模块子类

用 `collections.__all__` 查看所有子类。

::: python-repl title="查看所有子类"

```python
import collections
print(collections.__all__) # ['ChainMap', 'Counter', 'OrderedDict', 'UserDict', 'UserList', 'UserString', 'defaultdict', 'deque', 'namedtuple']
```

:::

共有九个子类，作用如下

| 子类        | 作用                                                                    |
| ----------- | ----------------------------------------------------------------------- |
| nametuple() | 创建命名元组子类的工厂函数，生成可以使用名字来访问元素内容的 tuple 子类 |
| deque       | 双端队列                                                                |
| ChainMap    | 类似字典(dict)的容器类，将多个映射集合到一个视图里面                    |
| Counter     | 字典的子类，提供了可哈希对象的计数功能                                  |
| OrderedDict | 字典的子类，保存了他们被添加的顺序，有序字典                            |
| defaultdict | 字典的子类，提供了一个工厂函数，为字典查询提供一个默认值                |
| UserDict    | 封装了字典对象，简化了字典子类化                                        |
| UserList    | 封装了列表对象，简化了列表子类化                                        |
| UserString  | 封装了字符串对象，简化了字符串子类化                                    |

==本文将介绍 Counter、deque、defaultdict 这三个好用且常用的子类。==

### 计数器 - Counter

一个计数器工具提供快速且方便的计数，Counter 是一个 dict 的子类，用于 ==计数可哈希对象==。它是一个集合，元素以字典键(key)存储，计数为值。

::: python-repl title="统计各单词出现次数"

```python
from collections import Counter
data = ['blue', 'red', 'blue', 'green', 'red', 'red']
print(Counter(data)) # Counter({'red': 3, 'blue': 2, 'green': 1})
```

:::

当然，可通过 `.items()` 转为可迭代对象

::: python-repl title="转为可迭代对象"

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

可哈希对象可太多了

::: python-repl title="其他可哈希对象"

```python
from collections import Counter

# 字符串
print(Counter('applications')) # Counter({'a': 2, 'p': 2, 'i': 2, 'l': 1, 'c': 1, 't': 1, 'o': 1, 'n': 1, 's': 1})

# 字典
print(Counter({'red': 4, 'blue': 2})) # Counter({'red': 4, 'blue': 2})

# 不明对象
print(Counter(dogs=114, cats=514)) # Counter({'cats': 514, 'dogs': 114})
```

:::

#### `elements()`

返回一个迭代器，每个元素将重复出现计数值次，按照元素首次出现的顺序返回。如果计数值小于 $1$，`elements()` 将忽略它。

::: python-repl title="演示"

```python
from collections import Counter
data = ['blue', 'red', 'blue', 'green', 'red', 'red']
c = Counter(data)

print(list(c.elements())) # [!code highlight] ['blue', 'blue', 'red', 'red', 'red', 'green']
```

:::

#### `most_common(n: int)`

返回一个列表，其中包含 $n$ 个最常见的元素及出现次数，由高到低排序，计数值相等的元素按首次出现的顺序排序。

::: python-repl title="演示"

```python
from collections import Counter
data = ['blue', 'red', 'blue', 'green', 'red', 'red']
c = Counter(data)

print(c.most_common(2)) # [!code highlight]
```

:::

#### `subtract(c: collections.Counter)`

从迭代对象减去元素

::: python-repl title="演示"

```python
from collections import Counter
c = Counter(a=4, b=2, c=0, d=-2)
d = Counter(a=1, b=2, c=3, d=4)
c.subtract(d)
print(c)
```

:::

#### 字典方法

通常字典方法都可用于 Counter 对象，除了有两个方法工作方式与字典不同。

`fromkeys(iterable)`

这个类方法没有在 Counter 中实现。

`update([iterable-or-mapping])`

从迭代对象计数元素或者从另一个映射对象（或计数器）添加。像 `dict.update()`，但是是加上，而不是替换。另外，迭代对象应该是序列元素，而不是一个 `(key, value)` 对。

::: python-repl title="演示"

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

### 双端队列 - deque

双端队列可以快速地从任意一端添加和弹出对象。

#### `append(x)`

添加 `x` 到右端。

::: python-repl title="演示"

```python
from collections import deque
d = deque('abc')

d.append([1, 2, 3])
print(d)
```

#### `appendleft()`

添加 `x` 到左端。

::: python-repl title="演示"

```python
from collections import deque
d = deque('abc')

d.appendleft([1, 2, 3])
print(d)
```

:::

#### `clear()`

移除所有元素。

::: python-repl title="演示"

```python
from collections import deque
d = deque('abc')

d.clear()
print(d)
```

:::

#### `copy()`

创建一份浅拷贝。

::: python-repl title="演示"

```python
from collections import deque
d = deque('abc')

c = d.copy()
print(c)
```

:::

#### `count(x)`

计算 deque 中元素等于 x 的个数。

::: python-repl title="演示"

```python
from collections import deque
d = deque('abca')

print(d.count('a'), d.count('b'))
```

:::

#### `extend(x)`

扩展 deque 的右侧，通过添加 iterable 参数中的元素。

::: python-repl title="演示"

```python
from collections import deque
d = deque('abc')

d.extend([1, 2, 3])
print(d)
```

:::

#### `extendleft(x)`

同理，不再赘述。

#### `index(x)`

返回 x 在 deque 中的位置，返回第一个匹配项，若没有则抛出 ValueError。

::: python-repl title="演示"

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

在位置 i 插入 x。

如果插入会导致一个限长的 deque 超出 maxlen，就会抛出 IndexError。

::: python-repl title="演示"

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

移去并返回最右侧元素，如果没有元素则抛出 IndexError。

::: python-repl title="演示"

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

移除找到的第一个 value，如果没有则抛出 ValueError。

::: python-repl title="演示"

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

将 deque 逆序排列，返回 None。

::: python-repl title="演示"

```python
from collections import deque
d = deque('abc')

print(d)
print(d.reverse())
print(d)
```

:::

#### `rotate(n:int = 1)`

向右循环移动 n 步。如果 n 是负数，就向左循环。

::: python-repl title="演示"

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

#### 补充

除了以上操作，deque 还支持迭代、封存、`len(d)`、`reversed(d)`、`copy.deepcopy(d)`、`copy.copy(d)`、成员检测运算符 in，以及下标引用（例如通过 `d[0]` 访问首个元素等。==索引访问在两端的复杂度均为 O(1)，但在中间则会退化至 O(n)。如需快速随机访问，请使用列表。==

Deque 从 3.5 版本还开始支持 `__add__()`、`__mul__()`和`__imul__()` 魔术方法。

### 默认字典 - defaultdict

字典非常实用，但你往往会有如下烦恼：

当你想在 dict 中获取一个 key，往往有两种方法，第一种是 get，第二种是通过 [] 获取。

==使用 dict 时，如果引用的 Key 不存在，就会抛出 KeyError。如果希望 key 不存在时，返回一个默认值，就可以用 defaultdict。==

#### 基础介绍

`defaultdict([default_factory[, ...]])`

返回一个新的类似字典的对象。defaultdict 是内置 dict 类的子类。它重载了一个方法并添加了一个可写的实例变量。其余功能与 dict 相同。

本对象包含一个名为 default_factory 的属性，构造时，第一个参数用于为该属性提供初始值，默认为 None。所有其他参数（包含关键字参数）都相当于传递给 dict 的构造函数。

defaultdict 对象除了支持标准 dict 的操作，还支持以下方法作为扩展：

`__missing__(key)`

如果 default_factory 属性为 None，则调用本方法会抛出 KeyError 异常，附带参数 key。

如果 default_factory 不为 None，则它会被（不带参数地）调用来为 key 提供一个默认值，这个值和 key 作为一对键值对被插入到字典中，并作为本方法的返回值返回。

如果调用 default_factory 时抛出了异常，这个异常会原封不动地向外层传递。

在无法找到所需键值时，本方法会被 dict 中的 `__getitem__()` 方法调用。无论本方法返回了值还是抛出了异常，都会被 `__getitem__()` 传递。

注意，`__missing__()` 不会 被 `__getitem__()` 以外的其他方法调用。意味着 get() 会像正常的 dict 那样返回 None，而不是使用 default_factory。

#### 示例

使用 list 作为 default_factory，很轻松地将（键-值对组成的）序列转换为（键-列表组成的）字典

::: python-repl title="演示"

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

当每个键第一次遇见时，它还没有在字典里面，所以自动创建该条目，即调用 default_factory 方法，返回一个空的 list。 list.append() 操作添加值到这个新的列表里。当再次存取该键时，就正常操作，list.append() 添加另一个值到列表中。这个计数比它的等价方法 dict.setdefault() 要快速和简单：

::: python-repl title="演示"

```python
s = [('green', 1), ('blue', 2), ('green', 3), ('blue', 4), ('red', 1)]
d = {}
for key, value in s:
    d.setdefault(key, []).append(value)

print(d)
print(sorted(d.items()))
```

:::

设置 default_factory 为 int，使 defaultdict 用于计数：

::: python-repl title="演示"

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

defaultdict 绝不会引发一个 KeyError。如果一个键不存在，defaultdict 会插入并返回一个占位符值来代替:

::: python-repl title="演示"

```python
from collections import defaultdict
d = defaultdict(list)
print(d["missing"])
```

:::

而若是使用常规字典运行相同逻辑：

::: python-repl title="演示"

```python
d = {}
print(d["missing"])
```

:::

## fractions

> [!INFO]
>
> Python 中的 fractions 库提供了对有理数精确计算的支持，适用于分数计算。

::: python-repl title="演示"

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
> 听这个名字你就可以想象，这是一个很强大的迭代器工具库，本文只介绍其特殊用法。

::: python-repl title="演示"

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
> 此 Python 库提供最小堆功能（优先队列）

::: python-repl title="演示"

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

## 引用的网络资源

[知乎 - 【万字长文详解】Python 库 collections，让你击败 99%的 Pythoner](https://zhuanlan.zhihu.com/p/343747724)
