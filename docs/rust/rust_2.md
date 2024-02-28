---
tags:
  - rust
---
# Rust常见概念

## 变量和可变性

### 变量和常量

rust默认变量不可变：

```rust
/*
let关键字用于声明变量，变量名后面必须指定类型，Rust可以根据上下文推断类型，所以可以省略类型
mut关键字用于声明可变变量，Rust默认变量是不可变的
*/
let x = 5;
x = x + 1; //报错，x不可变
```

rust定义可变变量，需要加上mut关键字：

```rust
let mut x = 5;
x = x + 1; //编译正确，x可变
```

常量必须指定类型，且不能被mut修饰：

```rust
/*
常量必须指定类型，不能使用mut关键字，Rust 对常量的命名约定是在单词之间使用全大写加下划线
常量的计算是在编译时进行的，所以必须是常量表达式，不能是函数调用的结果或者任何其他只能在运行时计算得到的值
*/
const THREE_HOURS_IN_SECONDS: u32 = 60 * 60 * 3;
println!("The value of THREE_HOURS_IN_SECONDS is: {THREE_HOURS_IN_SECONDS}");
```

### 变量隐藏

rust允许定义相同名称的变量，Rustacean 们称之为第一个变量被第二个 隐藏（Shadowing）了，当你使用变量名称时，编译器看到的是第二个变量：

```rust
fn main() {
    let x = 5; //将变量x绑定到5
    let x = x + 1; //将变量x重新绑定到6
    {
        let x = x * 2; //将变量x重新绑定到12
        println!("The value of x in the inner scope is: {x}");
    }
    //因为12是在内部作用域中绑定的，所以这里的x是外部作用域的x，所以这里的x是6
    println!("The value of x is: {x}");
}

```

变量隐藏的本质是创建了一个新的变量，如果变量名相同，则使用最近那个。

该特性常用于变量类型的转换，如用户输入一个字符串，我们希望知道有多少个空格：

```rust
fn main() {
    /*
    隐藏通常用来改变变量的类型，例如，我们可以从一个字符串类型变量变成一个数字类型变量：
    */
    let spaces = "   ";
    let spaces = spaces.len(); //隐藏spaces，变成一个数字类型变量
    println!("The value of spaces is: {spaces}");
}

```

第一个 `spaces` 变量是字符串类型，第二个 `spaces` 变量是数字类型。隐藏使我们不必使用不同的名字，如 `spaces_str` 和 `spaces_num`；相反，我们可以复用 spaces 这个更简单的名字。

### mut和隐藏结合

不可变变量被隐藏之后，还是不可变，但是有趣的是，隐藏和mut结合，我们可以完成不可变到可变之间的转换：

```rust
fn main() {
    /*
    有趣的是，我们可以结合隐藏和mut，使得不可变变量，变成可变变量（因为隐藏的本质是，创建了一个新的变量）：
    */
    let x = 5; //不可变变量
    println!("The value of x is: {x}");
    let mut x = x; //隐藏x，变成可变变量
    x = x + 1; //改变x的值
    println!("The value of x is: {x}");
}
```

你会发现`x`变成6了。

那我们可以完成可变到不可变的转换吗？我们编写如下代码：

```rust
fn main() {
    /*
    有趣的是，我们可以结合隐藏和mut，使得不可变变量，变成可变变量（因为隐藏的本质是，创建了一个新的变量）：
    */
    println!("\nmut_and_shadowing");
    let mut x = 5; //可变变量
    x = x + 1;
    println!("The value of x is: {x}");
    let x = x; //隐藏x，变成不可变变量
    x = x + 1; //这里会报错，因为x是不可变变量
    println!("The value of x is: {x}");
}
```

编译不通过，因为`x`变成了不可变变量。

所以，mut和隐藏相结合，居然可以改变变量的可变性！

其实根本原理是，隐藏会创建一个全新的变量，然后屏蔽之前的变量，所以判断变量能不能被修改，全看新变量有没有被`mut`修饰。
